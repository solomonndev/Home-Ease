import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

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

    // Create transaction — mark as completed and paid out
    const transaction = await db.transaction.create({
      data: {
        requestId,
        clientId: user.id,
        providerId: provider.id,
        amount,
        platformFee,
        providerPayout,
        paymentMethod: paymentMethod || 'CARD',
        status: 'COMPLETED',
        paidOutAt: new Date(),
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

    // Update service request status to COMPLETED and payment RELEASED
    await db.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        paymentStatus: 'RELEASED',
      }
    });

    // Update provider completed jobs
    await db.provider.update({
      where: { id: provider.id },
      data: { completedJobs: { increment: 1 } },
    });

    // Notify provider: payment received and released
    if (provider.bankName && provider.accountNumber) {
      await db.notification.create({
        data: {
          userId: provider.userId,
          type: 'PAYMENT',
          title: 'Payment Received! 💰',
          message: `${user.name} has paid ₦${amount.toLocaleString()} for the ${serviceRequest.serviceType.toLowerCase()} service (${serviceRequest.totalHours?.toFixed(1)} hours). ₦${providerPayout.toLocaleString()} has been sent to your ${provider.bankName} account (${provider.accountNumber}). Platform fee: ₦${platformFee.toLocaleString()}.`,
        }
      });
    } else {
      await db.notification.create({
        data: {
          userId: provider.userId,
          type: 'PAYMENT',
          title: 'Payment Received! 💰',
          message: `${user.name} has paid ₦${amount.toLocaleString()} for the ${serviceRequest.serviceType.toLowerCase()} service (${serviceRequest.totalHours?.toFixed(1)} hours). Your payout: ₦${providerPayout.toLocaleString()}. Please add bank details in your Profile to receive future payments.`,
        }
      });
    }

    // Notify client: payment confirmed
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'PAYMENT',
        title: 'Payment Confirmed ✅',
        message: `₦${amount.toLocaleString()} paid for ${serviceRequest.serviceType.toLowerCase()} (${serviceRequest.totalHours?.toFixed(1)} hours). ₦${providerPayout.toLocaleString()} has been sent to ${provider.user.name}'s bank account. Platform fee: ₦${platformFee.toLocaleString()}. Please leave a review!`,
      }
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Payment POST error:', error);
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
  }
}

// PUT /api/payments - Release or refund escrow payment (legacy support)
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

    let newStatus: string;
    let paymentStatus: string;
    let paidOutAt: Date | null = null;

    if (action === 'release') {
      newStatus = 'COMPLETED';
      paymentStatus = 'RELEASED';
      paidOutAt = new Date();

      if (!transaction.provider.bankName || !transaction.provider.accountNumber) {
        return NextResponse.json({
          error: 'Provider has not set up bank account details.',
          needsBankDetails: true,
        }, { status: 400 });
      }
    } else if (action === 'refund') {
      newStatus = 'REFUNDED';
      paymentStatus = 'REFUNDED';
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await db.transaction.update({
      where: { id: transactionId },
      data: {
        status: newStatus,
        paidOutAt,
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
      data: { paymentStatus }
    });

    // Notify both parties
    if (action === 'release') {
      await db.notification.create({
        data: {
          userId: transaction.provider.userId,
          type: 'PAYMENT',
          title: 'Payment Released to Your Account!',
          message: `₦${transaction.providerPayout.toLocaleString()} has been released to your ${transaction.provider.bankName} account (${transaction.provider.accountNumber}). Platform fee: ₦${transaction.platformFee.toLocaleString()}.`,
        }
      });
      await db.notification.create({
        data: {
          userId: transaction.clientId,
          type: 'PAYMENT',
          title: 'Payment Released to Provider',
          message: `₦${transaction.providerPayout.toLocaleString()} has been released to ${transaction.provider.user.name}'s bank account.`,
        }
      });
    } else {
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
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Payment PUT error:', error);
    return NextResponse.json({ error: 'Payment action failed' }, { status: 500 });
  }
}
