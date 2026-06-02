/**
 * Paystack Transfer API integration
 * Handles creating transfer recipients and initiating bank transfers to artisans
 *
 * Paystack docs:
 * - Create Transfer Recipient: https://paystack.com/docs/api/#transfer-recipients-create
 * - Initiate Transfer:         https://paystack.com/docs/api/#transfer-initiate
 * - Verify Transfer:           https://paystack.com/docs/api/#transfer-verify
 * - List Banks:               https://paystack.com/docs/api/#miscellaneous-banks
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE = 'https://api.paystack.co';

interface PaystackTransferRecipient {
  id: number;
  type: string;
  name: string;
  account_number: string;
  bank_code: string;
  currency: string;
  recipient_code: string;
  details: Record<string, unknown>;
}

interface PaystackTransferInit {
  id: number;
  source: string;
  amount: number;
  reference: string;
  status: string;
  recipient: string;
  domain: string;
  fees: number;
  fees_split: unknown;
}

interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway?: string;
  pay_with_bank: boolean;
  active: boolean;
  is_deleted: boolean;
  country: string;
  currency: string;
  type: string;
}

interface TransferResult {
  success: boolean;
  reference?: string;
  transferStatus?: string;
  amount?: number;
  error?: string;
}

/**
 * Fetch the list of Nigerian banks from Paystack to get the correct bank code
 */
async function getBankCode(bankName: string): Promise<string | null> {
  try {
    const response = await fetch(`${PAYSTACK_BASE}/bank?currency=NGN`, {
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (data.status && data.data) {
      const banks: PaystackBank[] = data.data;
      // Match bank name (case-insensitive, partial match)
      const matchedBank = banks.find(
        (b) =>
          b.name.toLowerCase().includes(bankName.toLowerCase()) ||
          bankName.toLowerCase().includes(b.name.toLowerCase())
      );
      return matchedBank ? matchedBank.code : null;
    }
    return null;
  } catch (error) {
    console.error('[Paystack] Error fetching bank list:', error);
    return null;
  }
}

/**
 * Create or retrieve a transfer recipient for a provider's bank account
 * Returns the recipient_code needed to initiate transfers
 */
async function createTransferRecipient(params: {
  accountNumber: string;
  bankCode: string;
  accountName: string;
  description?: string;
}): Promise<string | null> {
  try {
    const response = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: params.accountName,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: 'NGN',
        description: params.description || 'HomeEase provider payout',
      }),
    });

    const data = await response.json();
    if (data.status && data.data) {
      return (data.data as PaystackTransferRecipient).recipient_code;
    } else {
      console.error('[Paystack] Failed to create transfer recipient:', data.message);
      return null;
    }
  } catch (error) {
    console.error('[Paystack] Error creating transfer recipient:', error);
    return null;
  }
}

/**
 * Initiate a transfer to a provider's bank account
 * Amount should be in kobo (smallest currency unit)
 */
async function initiateTransfer(params: {
  recipientCode: string;
  amountInKobo: number;
  reason: string;
  reference: string;
}): Promise<PaystackTransferInit | null> {
  try {
    const response = await fetch(`${PAYSTACK_BASE}/transfer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: params.amountInKobo,
        reference: params.reference,
        recipient: params.recipientCode,
        reason: params.reason,
      }),
    });

    const data = await response.json();

    if (data.data) {
      return data.data as PaystackTransferInit;
    } else {
      console.error('[Paystack] Transfer initiation failed:', data.message);
      return null;
    }
  } catch (error) {
    console.error('[Paystack] Error initiating transfer:', error);
    return null;
  }
}

/**
 * Verify the status of a transfer
 */
async function verifyTransfer(reference: string): Promise<string | null> {
  try {
    const response = await fetch(`${PAYSTACK_BASE}/transfer/verify/${encodeURIComponent(reference)}`, {
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (data.status && data.data) {
      return data.data.status as string; // 'pending', 'success', 'failed', 'rejected'
    }
    return null;
  } catch (error) {
    console.error('[Paystack] Error verifying transfer:', error);
    return null;
  }
}

/**
 * Main function: Send money to a provider's bank account via Paystack
 *
 * @param params - Provider bank details and amount
 * @returns TransferResult with success/failure info
 */
export async function sendToBank(params: {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amountInNaira: number;
  requestId: string;
  serviceType: string;
}): Promise<TransferResult> {
  if (!PAYSTACK_SECRET_KEY) {
    return {
      success: false,
      error: 'Paystack is not configured. Add PAYSTACK_SECRET_KEY to your environment variables.',
    };
  }

  // Step 1: Resolve bank name to bank code
  const bankCode = await getBankCode(params.bankName);
  if (!bankCode) {
    return {
      success: false,
      error: `Could not find bank "${params.bankName}" in Paystack. Please ensure the bank name is correct (e.g., "Access Bank", "GTBank", "First Bank").`,
    };
  }

  // Step 2: Create transfer recipient
  const recipientCode = await createTransferRecipient({
    accountNumber: params.accountNumber,
    bankCode,
    accountName: params.accountName,
    description: `HomeEase payout - ${params.serviceType} service (${params.requestId.slice(-6)})`,
  });

  if (!recipientCode) {
    return {
      success: false,
      error: 'Failed to create bank transfer recipient. Please verify the account number and bank name are correct.',
    };
  }

  // Step 3: Initiate transfer (amount in kobo)
  const amountInKobo = Math.round(params.amountInNaira * 100);
  const transferRef = `HE-PAYOUT-${params.requestId.slice(-8)}-${Date.now()}`;

  const transfer = await initiateTransfer({
    recipientCode,
    amountInKobo,
    reason: `HomeEase payout - ${params.serviceType} service (${params.requestId.slice(-6)})`,
    reference: transferRef,
  });

  if (!transfer) {
    return {
      success: false,
      error: 'Failed to initiate bank transfer. The transfer may have been rejected. Please verify the account details.',
    };
  }

  // Step 4: Check if transfer was immediately successful or pending
  // Paystack transfers can be 'pending' (processing), 'success', 'failed', or 'rejected'
  return {
    success: transfer.status === 'success' || transfer.status === 'pending',
    reference: transfer.reference,
    transferStatus: transfer.status,
    amount: params.amountInNaira,
    error: transfer.status === 'failed' ? 'Transfer was rejected by the bank.' :
           transfer.status === 'rejected' ? 'Transfer was rejected. Please verify the account details.' : undefined,
  };
}

/**
 * Check the status of a previously initiated transfer
 */
export async function checkTransferStatus(reference: string): Promise<string | null> {
  if (!PAYSTACK_SECRET_KEY) return null;
  return verifyTransfer(reference);
}
