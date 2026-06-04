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
// Credits provider's virtual wallet instead of bank transfer
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

    // Create transaction record
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
        walletCredited: true,
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

    // Credit provider's virtual wallet
    let wallet = await db.wallet.findUnique({
      where: { userId: provider.userId },
    });

    if (!wallet) {
      wallet = await db.wallet.create({
        data: { userId: provider.userId },
      });
    }

    const newBalance = wallet.balance + providerPayout;

    await db.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: providerPayout },
        totalEarnings: { increment: providerPayout },
        totalCommission: { increment: platformFee },
      },
    });

    await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'EARNING',
        amount: providerPayout,
        description: `Payment for ${serviceRequest.serviceType} service`,
        reference: requestId,
        balanceAfter: newBalance,
      },
    });

    // Update service request status
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

    // Notify provider
    await db.notification.create({
      data: {
        userId: provider.userId,
        type: 'PAYMENT',
        title: 'Payment Received — Credited to Wallet! 💰',
        message: `${user.name} has paid ₦${amount.toLocaleString()} for the ${serviceRequest.serviceType.toLowerCase()} service (${serviceRequest.totalHours?.toFixed(1)} hours). ₦${providerPayout.toLocaleString()} has been credited to your wallet. Platform fee: ₦${platformFee.toLocaleString()}.`,
      }
    });

    // Notify client
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'PAYMENT',
        title: 'Payment Received, Credited to Artisan\'s Wallet ✅',
        message: `₦${amount.toLocaleString()} paid for ${serviceRequest.serviceType.toLowerCase()} (${serviceRequest.totalHours?.toFixed(1)} hours). ₦${providerPayout.toLocaleString()} has been credited to ${provider.user.name}'s wallet. Platform fee: ₦${platformFee.toLocaleString()}. Please leave a review!`,
      }
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Payment POST error:', error);
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
  }
}

// PUT /api/payments - Release escrow payment to wallet or refund
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
      // Credit provider's virtual wallet instead of bank transfer
      let wallet = await db.wallet.findUnique({
        where: { userId: transaction.provider.userId },
      });

      if (!wallet) {
        wallet = await db.wallet.create({
          data: { userId: transaction.provider.userId },
        });
      }

      const newBalance = wallet.balance + transaction.providerPayout;

      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: transaction.providerPayout },
          totalEarnings: { increment: transaction.providerPayout },
          totalCommission: { increment: transaction.platformFee },
        },
      });

      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'EARNING',
          amount: transaction.providerPayout,
          description: `Payment for ${transaction.serviceRequest.serviceType} service`,
          reference: transaction.requestId,
          balanceAfter: newBalance,
        },
      });

      // Update transaction record
      const updated = await db.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          paidOutAt: new Date(),
          walletCredited: true,
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

      // Notify both parties about the wallet credit
      await db.notification.create({
        data: {
          userId: transaction.provider.userId,
          type: 'PAYMENT',
          title: 'Payment Released — Credited to Wallet! 💰',
          message: `₦${transaction.providerPayout.toLocaleString()} has been credited to your wallet for the ${transaction.serviceRequest.serviceType.toLowerCase()} service. Platform fee: ₦${transaction.platformFee.toLocaleString()}.`,
        }
      });
      await db.notification.create({
        data: {
          userId: transaction.clientId,
          type: 'PAYMENT',
          title: 'Payment Released to Provider',
          message: `₦${transaction.providerPayout.toLocaleString()} has been credited to ${transaction.provider.user.name}'s wallet. Platform fee: ₦${transaction.platformFee.toLocaleString()}. Please leave a review!`,
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
