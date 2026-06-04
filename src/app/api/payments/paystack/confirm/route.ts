import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const PLATFORM_FEE_PERCENT = 0.05;

// POST /api/payments/paystack/confirm - Verify Paystack payment, credit provider's virtual wallet
// Called from the Paystack inline popup callback after successful payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error('[Paystack Confirm] PAYSTACK_SECRET_KEY not configured');
      return NextResponse.json({ error: 'Paystack is not configured on the server. Please add PAYSTACK_SECRET_KEY to your Vercel environment variables.' }, { status: 500 });
    }

    // Step 1: Verify the transaction with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== 'success') {
      console.error('[Paystack Confirm] Verification failed:', verifyData);
      return NextResponse.json(
        { error: 'Payment verification failed. The charge was not successful on Paystack.' },
        { status: 400 }
      );
    }

    const paymentData = verifyData.data;
    const metadata = paymentData.metadata || {};
    const requestId = metadata.requestId;
    const providerId = metadata.providerId;

    if (!requestId) {
      return NextResponse.json(
        { error: 'No request ID in payment metadata' },
        { status: 400 }
      );
    }

    // Step 2: Check if transaction already recorded (idempotent)
    const existingTx = await db.transaction.findUnique({ where: { requestId } });
    if (existingTx) {
      // Fix legacy bug: if status is still AWAITING_PAYMENT but payment exists, update it
      const serviceRequestStale = await db.serviceRequest.findUnique({ where: { id: requestId } });
      if (serviceRequestStale && serviceRequestStale.status === 'AWAITING_PAYMENT') {
        await db.serviceRequest.update({
          where: { id: requestId },
          data: {
            status: 'COMPLETED',
            paymentStatus: existingTx.status === 'COMPLETED' ? 'RELEASED' : 'HELD_IN_ESCROW',
          },
        });
      }
      return NextResponse.json({
        success: true,
        message: 'Payment already recorded',
        requestId,
        status: existingTx.status,
        amount: existingTx.amount,
      });
    }

    // Step 3: Get the service request with provider details
    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
      include: { provider: { include: { user: true } } },
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    // Step 4: Calculate amounts
    const amount = paymentData.amount / 100; // Convert from kobo to naira
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT);
    const providerPayout = amount - platformFee;
    const provider = serviceRequest.provider;

    // Step 5: Create the transaction record
    await db.transaction.create({
      data: {
        requestId,
        clientId: serviceRequest.clientId,
        providerId: provider?.id || providerId,
        amount,
        platformFee,
        providerPayout,
        paymentMethod: 'CARD',
        status: 'COMPLETED',
        paidOutAt: new Date(),
        walletCredited: true,
      },
    });

    // Step 6: Credit the provider's virtual wallet
    if (provider) {
      // Get or create provider's wallet
      let wallet = await db.wallet.findUnique({
        where: { userId: provider.userId },
      });

      if (!wallet) {
        wallet = await db.wallet.create({
          data: { userId: provider.userId },
        });
      }

      const newBalance = wallet.balance + providerPayout;

      // Add providerPayout to wallet.balance and totalEarnings
      // Add platformFee to wallet.totalCommission
      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: providerPayout },
          totalEarnings: { increment: providerPayout },
          totalCommission: { increment: platformFee },
        },
      });

      // Create WalletTransaction with type="EARNING"
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
    }

    // Step 7: Update service request status
    await db.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        paymentStatus: 'RELEASED',
      },
    });

    if (provider) {
      await db.provider.update({
        where: { id: provider.id },
        data: { completedJobs: { increment: 1 } },
      });
    }

    // Step 8: Send notifications
    const client = await db.user.findUnique({ where: { id: serviceRequest.clientId } });

    if (provider) {
      await db.notification.create({
        data: {
          userId: provider.userId,
          type: 'PAYMENT',
          title: 'Payment Received — Credited to Wallet! 💰',
          message: `${client?.name || 'A client'} paid ₦${amount.toLocaleString()} for the ${serviceRequest.serviceType.toLowerCase()} service. ₦${providerPayout.toLocaleString()} has been credited to your wallet. Platform fee: ₦${platformFee.toLocaleString()}.`,
        },
      });
    }

    if (client) {
      await db.notification.create({
        data: {
          userId: client.id,
          type: 'PAYMENT',
          title: 'Payment Received, Credited to Artisan\'s Wallet ✅',
          message: `Your payment of ₦${amount.toLocaleString()} for ${serviceRequest.serviceType.toLowerCase()} was received successfully. ₦${providerPayout.toLocaleString()} has been credited to ${provider?.user.name || 'the artisan'}'s wallet. Platform fee: ₦${platformFee.toLocaleString()}. Please leave a review!`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment received, credited to artisan\'s wallet',
      requestId,
      amount,
      providerPayout,
      platformFee,
    });
  } catch (error) {
    console.error('[Paystack Confirm] Error:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}
