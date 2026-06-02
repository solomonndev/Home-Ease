import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sendToBank } from '@/lib/paystack-transfer';

const PLATFORM_FEE_PERCENT = 0.05; // 5% platform fee

// GET /api/payments - List transactions with transparency data
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let where: any = {};
    if (user.role === 'CLIENT') {
      where.clientId = user.id;
    } else if (user.role === 'PROVIDER') {
      const provider = await db.provider.findUnique({ where: { userId: user.id } });
      if (provider) where.providerId = provider.id;
    }
    if (status) where.status = status;

    const transactions = await db.transaction.findMany({
      where,
      include: {
        serviceRequest: {
          include: {
            client: { select: { id: true, name: true } },
            provider: { include: { user: { select: { id: true, name: true } } } },
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary stats for transparency
    const totalInEscrow = transactions
      .filter(t => t.status === 'ESCROW')
      .reduce((sum, t) => sum + t.providerPayout, 0);

    const totalReleased = transactions
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.providerPayout, 0);

    const totalRefunded = transactions
      .filter(t => t.status === 'REFUNDED')
      .reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      transactions,
      summary: {
        totalInEscrow,
        totalReleased,
        totalRefunded,
        platformFeeRate: PLATFORM_FEE_PERCENT,
      }
    });
  } catch (error) {
    console.error('Payments GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

// POST /api/payments - Client pays AFTER artisan completes the work
// Flow: Artisan checks out → calculates total (hours × rate) → client pays → artisan gets paid
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, paymentMethod } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        provider: { include: { user: { select: { id: true, name: true } } },
        },
      }
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    if (serviceRequest.clientId !== user.id) {
      return NextResponse.json({ error: 'Only the client can make payment' }, { status: 403 });
    }

    if (!serviceRequest.providerId) {
      return NextResponse.json({ error: 'No provider assigned yet' }, { status: 400 });
    }

    // Must be in AWAITING_PAYMENT status (artisan has checked out)
    if (serviceRequest.status !== 'AWAITING_PAYMENT') {
      return NextResponse.json({ error: 'Service must be completed by the artisan before payment' }, { status: 400 });
    }

    // Check if payment already exists
    const existingTx = await db.transaction.findUnique({ where: { requestId } });
    if (existingTx) {
      return NextResponse.json({ error: 'Payment already processed for this request' }, { status: 400 });
    }

    const provider = await db.provider.findUnique({ where: { id: serviceRequest.providerId }, include: { user: true } });
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const amount = serviceRequest.amount;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    // Calculate platform fee and provider payout
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT);
    const providerPayout = amount - platformFee;

    // --- ACTUAL BANK TRANSFER VIA PAYSTACK ---
    let transferRef: string | null = null;
    let transferStatus: string | null = null;

    if (provider.bankName && provider.accountNumber) {
      const transferResult = await sendToBank({
        bankName: provider.bankName,
        accountNumber: provider.accountNumber,
        accountName: provider.accountName || provider.user.name,
        amountInNaira: providerPayout,
        requestId,
        serviceType: serviceRequest.serviceType,
      });

      if (transferResult.success) {
        transferRef = transferResult.reference || null;
        transferStatus = transferResult.transferStatus || 'PENDING';
      } else {
        // Transfer failed — still record the payment but mark transfer as failed
        console.error('[Payment POST] Bank transfer failed:', transferResult.error);
        transferStatus = 'FAILED';
      }
    }

    // Create transaction with transfer tracking
    const transaction = await db.transaction.create({
      data: {
        requestId,
        clientId: user.id,
        providerId: provider.id,
        amount,
        platformFee,
        providerPayout,
        paymentMethod: paymentMethod || 'CARD',
        status: transferStatus === 'FAILED' ? 'ESCROW' : 'COMPLETED',
        paidOutAt: transferStatus !== 'FAILED' ? new Date() : null,
        transferRef,
        transferStatus,
      },
      include: {
        serviceRequest: {
          include: {
            client: { select: { id: true, name: true } },
            provider: { include: { user: { select: { id: true, name: true } } } },
          }
        }
      }
    });

    // Update service request status
    if (transferStatus !== 'FAILED') {
      await db.serviceRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          paymentStatus: 'RELEASED',
        }
      });
    }

    // Update provider completed jobs only if transfer succeeded
    if (transferStatus !== 'FAILED') {
      await db.provider.update({
        where: { id: provider.id },
        data: { completedJobs: { increment: 1 } },
      });
    }

    // Notify provider
    if (provider.bankName && provider.accountNumber) {
      if (transferStatus === 'FAILED') {
        await db.notification.create({
          data: {
            userId: provider.userId,
            type: 'PAYMENT',
            title: 'Payment Received (Transfer Pending)',
            message: `${user.name} has paid ₦${amount.toLocaleString()} for the ${serviceRequest.serviceType.toLowerCase()} service (${serviceRequest.totalHours?.toFixed(1)} hours). Your payout: ₦${providerPayout.toLocaleString()}. The automatic bank transfer failed — please verify your bank details in your Profile. An admin can manually release the payment from escrow.`,
          }
        });
      } else {
        await db.notification.create({
          data: {
            userId: provider.userId,
            type: 'PAYMENT',
            title: 'Payment Transferred to Your Bank! 💰',
            message: `${user.name} has paid ₦${amount.toLocaleString()} for the ${serviceRequest.serviceType.toLowerCase()} service (${serviceRequest.totalHours?.toFixed(1)} hours). ₦${providerPayout.toLocaleString()} has been transferred to your ${provider.bankName} account (${provider.accountNumber}). Transfer ref: ${transferRef || 'N/A'}. Status: ${transferStatus || 'processing'}. Money should arrive within 1-24 hours. Platform fee: ₦${platformFee.toLocaleString()}.`,
          }
        });
      }
    } else {
      await db.notification.create({
        data: {
          userId: provider.userId,
          type: 'PAYMENT',
          title: 'Payment Received! 💰',
          message: `${user.name} has paid ₦${amount.toLocaleString()} for the ${serviceRequest.serviceType.toLowerCase()} service (${serviceRequest.totalHours?.toFixed(1)} hours). Your payout: ₦${providerPayout.toLocaleString()}. Please add bank details in your Profile to receive payments.`,
        }
      });
    }

    // Notify client
    const clientMsg = transferStatus === 'FAILED'
      ? `₦${amount.toLocaleString()} paid for ${serviceRequest.serviceType.toLowerCase()} (${serviceRequest.totalHours?.toFixed(1)} hours). The automatic transfer to the artisan's bank failed — it will be retried or an admin can release it manually.`
      : `₦${amount.toLocaleString()} paid for ${serviceRequest.serviceType.toLowerCase()} (${serviceRequest.totalHours?.toFixed(1)} hours). ₦${providerPayout.toLocaleString()} has been transferred to ${provider.user.name}'s bank account. Transfer ref: ${transferRef || 'N/A'}. Platform fee: ₦${platformFee.toLocaleString()}. Please leave a review!`;
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'PAYMENT',
        title: transferStatus === 'FAILED' ? 'Payment Processing' : 'Payment Confirmed ✅',
        message: clientMsg,
      }
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Payment POST error:', error);
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
  }
}

// PUT /api/payments - Release escrow payment (with actual bank transfer) or refund
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { transactionId, action } = body; // action: 'release', 'refund'

    if (!transactionId || !action) {
      return NextResponse.json({ error: 'Transaction ID and action are required' }, { status: 400 });
    }

    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        serviceRequest: true,
        provider: { include: { user: true } },
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Only client (who paid) or admin can release/refund
    if (user.role === 'CLIENT' && transaction.clientId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (transaction.status !== 'ESCROW') {
      return NextResponse.json({ error: 'Transaction is not in escrow' }, { status: 400 });
    }

    if (action === 'release') {
      if (!transaction.provider.bankName || !transaction.provider.accountNumber) {
        return NextResponse.json({
          error: 'Provider has not set up bank account details.',
          needsBankDetails: true,
        }, { status: 400 });
      }

      // --- ACTUAL BANK TRANSFER VIA PAYSTACK ---
      const transferResult = await sendToBank({
        bankName: transaction.provider.bankName,
        accountNumber: transaction.provider.accountNumber,
        accountName: transaction.provider.accountName || transaction.provider.user.name,
        amountInNaira: transaction.providerPayout,
        requestId: transaction.requestId,
        serviceType: transaction.serviceRequest.serviceType,
      });

      if (!transferResult.success) {
        return NextResponse.json({
          error: `Bank transfer failed: ${transferResult.error}. The payment is still in escrow. Please check the provider's bank details and try again.`,
          transferError: true,
        }, { status: 400 });
      }

      // Store the Paystack transfer reference and status
      const updated = await db.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          paidOutAt: new Date(),
          transferRef: transferResult.reference || null,
          transferStatus: transferResult.transferStatus || 'PENDING',
        },
        include: {
          serviceRequest: {
            include: {
              client: { select: { id: true, name: true } },
              provider: { include: { user: { select: { id: true, name: true } } } },
            }
          }
        }
      });

      await db.serviceRequest.update({
        where: { id: transaction.requestId },
        data: { paymentStatus: 'RELEASED' }
      });

      // Notify both parties about the actual bank transfer
      await db.notification.create({
        data: {
          userId: transaction.provider.userId,
          type: 'PAYMENT',
          title: 'Payment Transferred to Your Bank! 💰',
          message: `₦${transaction.providerPayout.toLocaleString()} has been transferred to your ${transaction.provider.bankName} account (${transaction.provider.accountNumber}). Transfer ref: ${transferResult.reference || 'N/A'}. Status: ${transferResult.transferStatus || 'processing'}. The money should arrive within 1-24 hours. Platform fee: ₦${transaction.platformFee.toLocaleString()}.`,
        }
      });
      await db.notification.create({
        data: {
          userId: transaction.clientId,
          type: 'PAYMENT',
          title: 'Payment Released to Provider',
          message: `₦${transaction.providerPayout.toLocaleString()} has been transferred to ${transaction.provider.user.name}'s ${transaction.provider.bankName} account. Transfer ref: ${transferResult.reference || 'N/A'}. Platform fee: ₦${transaction.platformFee.toLocaleString()}. Please leave a review!`,
        }
      });

      return NextResponse.json(updated);
    } else if (action === 'refund') {
      const updated = await db.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'REFUNDED',
        },
        include: {
          serviceRequest: {
            include: {
              client: { select: { id: true, name: true } },
              provider: { include: { user: { select: { id: true, name: true } } } },
            }
          }
        }
      });

      await db.serviceRequest.update({
        where: { id: transaction.requestId },
        data: { paymentStatus: 'REFUNDED' }
      });

      await db.notification.create({
        data: {
          userId: transaction.provider.userId,
          type: 'PAYMENT',
          title: 'Payment Refunded to Client',
          message: `₦${transaction.amount.toLocaleString()} has been refunded to the client.`,
        }
      });
      await db.notification.create({
        data: {
          userId: transaction.clientId,
          type: 'PAYMENT',
          title: 'Refund Processed',
          message: `₦${transaction.amount.toLocaleString()} has been refunded to you.`,
        }
      });

      return NextResponse.json(updated);
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "release" or "refund".' }, { status: 400 });
    }
  } catch (error) {
    console.error('Payment PUT error:', error);
    return NextResponse.json({ error: 'Payment action failed' }, { status: 500 });
  }
}
