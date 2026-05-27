import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const PAYSTACK_BASE = 'https://api.paystack.co';

// POST /api/payments/payout - Initiate a Paystack transfer to a provider
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.json({ error: 'Paystack is not configured. Add PAYSTACK_SECRET_KEY to your .env file.' }, { status: 500 });
    }

    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // Fetch transaction with related data
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        serviceRequest: { include: { client: { select: { id: true, name: true, email: true } } } },
        provider: { include: { user: { select: { id: true, name: true } } } },
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Only allow payout for completed/escrow transactions
    if (!['COMPLETED', 'ESCROW'].includes(transaction.status)) {
      return NextResponse.json({ error: 'Transaction must be completed or in escrow before payout' }, { status: 400 });
    }

    // Already has a pending/processing transfer
    if (transaction.transferStatus && ['PENDING', 'PROCESSING'].includes(transaction.transferStatus)) {
      return NextResponse.json({ error: 'A transfer is already in progress for this transaction' }, { status: 400 });
    }

    // Successful transfer already done
    if (transaction.transferStatus === 'SUCCESS') {
      return NextResponse.json({ error: 'Transfer has already been completed for this transaction' }, { status: 400 });
    }

    const provider = transaction.provider;
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Validate provider bank details
    if (!provider.bankName || !provider.accountNumber || !provider.accountName) {
      return NextResponse.json({
        error: 'Provider has no bank account details on file. Cannot initiate payout.',
        needsBankDetails: true,
      }, { status: 400 });
    }

    // Step 1: Create or get Transfer Recipient
    const recipientCode = await getOrCreateTransferRecipient(
      provider,
      paystackSecretKey
    );

    // Step 2: Initiate Transfer
    const payoutAmountKobo = Math.round(transaction.providerPayout * 100);

    const transferPayload: any = {
      source: 'balance',
      amount: payoutAmountKobo,
      recipient: recipientCode,
      reference: `HE-PAYOUT-${transaction.id}-${Date.now()}`,
      reason: `Payout for ${transaction.serviceRequest.serviceType} service - Request #${transaction.requestId.slice(-6)}`,
    };

    const transferResponse = await fetch(`${PAYSTACK_BASE}/transfer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transferPayload),
    });

    const transferData = await transferResponse.json();

    if (!transferData.status) {
      console.error('Paystack transfer error:', transferData);
      return NextResponse.json({
        error: 'Failed to initiate transfer to provider.',
        details: transferData.message,
      }, { status: 400 });
    }

    // Step 3: Update transaction with transfer details
    const updatedTransaction = await db.transaction.update({
      where: { id: transactionId },
      data: {
        transferRef: transferData.data.reference || transferData.data.id,
        transferStatus: 'PENDING',
      },
    });

    // Step 4: Log admin action
    await db.adminLog.create({
      data: {
        adminId: user.id,
        action: 'PAYOUT_PROVIDER',
        details: `Initiated ₦${transaction.providerPayout.toLocaleString()} payout to ${provider.user.name} (${provider.bankName} ••••${provider.accountNumber.slice(-4)}) for request ${transaction.requestId.slice(-6)}. Transfer ref: ${transferData.data.reference}`,
      }
    });

    // Step 5: Notify provider
    await db.notification.create({
      data: {
        userId: provider.userId,
        type: 'PAYMENT',
        title: 'Payout Initiated',
        message: `₦${transaction.providerPayout.toLocaleString()} is being sent to your ${provider.bankName} account (••••${provider.accountNumber.slice(-4)}). You will be notified once the transfer is complete.`,
      }
    });

    return NextResponse.json({
      success: true,
      transfer: {
        reference: transferData.data.reference,
        amount: transaction.providerPayout,
        recipient: recipientCode,
        status: transferData.data.status,
      },
      transaction: updatedTransaction,
    });
  } catch (error) {
    console.error('Payout error:', error);
    return NextResponse.json({ error: 'Payout initiation failed' }, { status: 500 });
  }
}

// GET /api/payments/payout - List all transactions pending payout (admin)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // filter by transfer status

    let where: any = {};
    if (status) {
      where.transferStatus = status;
    }

    const transactions = await db.transaction.findMany({
      where,
      include: {
        serviceRequest: {
          include: {
            client: { select: { id: true, name: true, email: true } },
          }
        },
        provider: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Summary stats
    const pendingPayout = transactions
      .filter(t => !t.transferStatus && ['COMPLETED', 'ESCROW'].includes(t.status))
      .reduce((sum, t) => sum + t.providerPayout, 0);

    const inTransit = transactions
      .filter(t => ['PENDING', 'PROCESSING'].includes(t.transferStatus || ''))
      .reduce((sum, t) => sum + t.providerPayout, 0);

    const totalPaid = transactions
      .filter(t => t.transferStatus === 'SUCCESS')
      .reduce((sum, t) => sum + t.providerPayout, 0);

    const totalFailed = transactions
      .filter(t => t.transferStatus === 'FAILED')
      .reduce((sum, t) => sum + t.providerPayout, 0);

    return NextResponse.json({
      transactions,
      summary: {
        pendingPayout,
        inTransit,
        totalPaid,
        totalFailed,
      }
    });
  } catch (error) {
    console.error('Payout GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch payout data' }, { status: 500 });
  }
}

// Helper: Create or retrieve a Paystack transfer recipient
async function getOrCreateTransferRecipient(
  provider: any,
  secretKey: string
): Promise<string> {
  // Check if we already have a recipient code stored
  // For this, we store it in the provider's verificationStatus or we create each time
  // Paystack deduplicates by account number + bank code

  // Get the bank code for the bank name
  const bankListResponse = await fetch(`${PAYSTACK_BASE}/bank`, {
    headers: { 'Authorization': `Bearer ${secretKey}` },
  });
  const bankListData = await bankListResponse.json();
  const bank = bankListData.data?.find(
    (b: any) => b.name.toLowerCase().includes(provider.bankName.toLowerCase())
  );

  if (!bank) {
    // Try common Nigerian bank mappings
    const bankCodeMap: Record<string, string> = {
      'access': '044',
      'gtbank': '058',
      'guaranty trust': '058',
      'first bank': '011',
      'uba': '033',
      'united bank': '033',
      'zenith': '057',
      'sterling': '232',
      'fidelity': '070',
      'ecobank': '050',
      'wema': '035',
      'polaris': '076',
      'skye': '076',
      'heritage': '030',
      'keystone': '082',
      ' PROVIDUS': '101',
      'taj': '512',
      'opay': '999',
      'palm': '526',
      'moniepoint': '999991',
      'kuda': '50211',
    };

    const code = bankCodeMap[provider.bankName.toLowerCase()] ||
      bankCodeMap[provider.bankName.toLowerCase().split(' ')[0]];

    if (code) {
      return createRecipient(secretKey, code, provider);
    }

    throw new Error(`Bank "${provider.bankName}" not found on Paystack. Please verify the bank name.`);
  }

  return createRecipient(secretKey, bank.code, provider);
}

async function createRecipient(
  secretKey: string,
  bankCode: string,
  provider: any
): Promise<string> {
  const recipientPayload = {
    type: 'nuban',
    name: provider.accountName,
    account_number: provider.accountNumber,
    bank_code: bankCode,
    currency: 'NGN',
  };

  const recipientResponse = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recipientPayload),
  });

  const recipientData = await recipientResponse.json();

  if (!recipientData.status) {
    console.error('Paystack recipient creation error:', recipientData);
    throw new Error(`Failed to create transfer recipient: ${recipientData.message}`);
  }

  return recipientData.data.recipient_code;
}
