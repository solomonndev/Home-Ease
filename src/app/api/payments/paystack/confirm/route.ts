import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendToBank } from '@/lib/paystack-transfer';

const PLATFORM_FEE_PERCENT = 0.05;

// POST /api/payments/paystack/confirm - Verify Paystack payment, record in DB, and transfer to artisan
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

    // Step 5: Initiate bank transfer to artisan immediately
    let transferRef: string | null = null;
    let transferStatus: string | null = null;
    let transferError: string | null = null;

    if (provider?.bankName && provider?.accountNumber) {
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
        transferError = transferResult.error || 'Transfer failed';
        transferStatus = 'FAILED';
        console.error('[Paystack Confirm] Bank transfer failed:', transferError);
      }
    } else {
      console.log('[Paystack Confirm] Provider has no bank details set — payment held in escrow');
    }

    // Step 6: Create the transaction record
    const txStatus = (!provider?.bankName || !provider?.accountNumber) ? 'ESCROW'
      : (transferStatus === 'FAILED' ? 'ESCROW' : 'COMPLETED');

    await db.transaction.create({
      data: {
        requestId,
        clientId: serviceRequest.clientId,
        providerId: provider?.id || providerId,
        amount,
        platformFee,
        providerPayout,
        paymentMethod: 'CARD',
        status: txStatus,
        paidOutAt: txStatus === 'COMPLETED' ? new Date() : null,
        transferRef,
        transferStatus: transferStatus || null,
      },
    });

    // Step 7: Update service request status
    // Work was already done (artisan checked out), and payment has been received.
    // Always mark as COMPLETED — the only question is whether the money reached the artisan.
    if (txStatus === 'COMPLETED') {
      // Transfer initiated successfully
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
    } else {
      // Payment received but transfer failed or no bank details
      await db.serviceRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          paymentStatus: 'HELD_IN_ESCROW',
        },
      });
      if (provider) {
        await db.provider.update({
          where: { id: provider.id },
          data: { completedJobs: { increment: 1 } },
        });
      }
    }

    // Step 8: Send notifications
    const client = await db.user.findUnique({ where: { id: serviceRequest.clientId } });

    if (provider) {
      if (txStatus === 'COMPLETED') {
        // Transfer successful
        await db.notification.create({
          data: {
            userId: provider.userId,
            type: 'PAYMENT',
            title: 'Payment Transferred to Your Bank! 💰',
            message: `₦${providerPayout.toLocaleString()} has been transferred to your ${provider.bankName} account (${provider.accountNumber}). Transfer ref: ${transferRef || 'N/A'}. Status: ${transferStatus || 'processing'}. Money should arrive within 1-24 hours. Platform fee: ₦${platformFee.toLocaleString()}.`,
          },
        });
      } else if (transferStatus === 'FAILED') {
        // Transfer failed
        await db.notification.create({
          data: {
            userId: provider.userId,
            type: 'PAYMENT',
            title: 'Payment Received (Transfer Pending)',
            message: `${client?.name || 'A client'} paid ₦${amount.toLocaleString()} for the ${serviceRequest.serviceType.toLowerCase()} service. Your payout: ₦${providerPayout.toLocaleString()}. The automatic bank transfer failed — please verify your bank details in your Profile.`,
          },
        });
      } else {
        // No bank details
        await db.notification.create({
          data: {
            userId: provider.userId,
            type: 'PAYMENT',
            title: 'Payment Received — Add Bank Details',
            message: `${client?.name || 'A client'} paid ₦${amount.toLocaleString()} for the ${serviceRequest.serviceType.toLowerCase()} service. Your payout: ₦${providerPayout.toLocaleString()}. Please add your bank details in Profile to receive payment.`,
          },
        });
      }
    }

    if (client) {
      if (txStatus === 'COMPLETED') {
        await db.notification.create({
          data: {
            userId: client.id,
            type: 'PAYMENT',
            title: 'Payment Confirmed — Artisan Paid ✅',
            message: `₦${providerPayout.toLocaleString()} has been transferred to ${provider?.user.name || 'the artisan'}'s bank account for the ${serviceRequest.serviceType.toLowerCase()} service. Platform fee: ₦${platformFee.toLocaleString()}. Please leave a review!`,
          },
        });
      } else {
        await db.notification.create({
          data: {
            userId: client.id,
            type: 'PAYMENT',
            title: 'Payment Successfully Received ✅',
            message: `Your payment of ₦${amount.toLocaleString()} for ${serviceRequest.serviceType.toLowerCase()} was received successfully. Cannot process real payment to artisan because we are currently on test mode.`,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: txStatus === 'COMPLETED'
        ? 'Payment confirmed and transferred to artisan\'s bank account'
        : 'Payment confirmed and held in escrow',
      requestId,
      amount,
      providerPayout,
      platformFee,
      transferStatus: transferStatus || null,
      txStatus,
    });
  } catch (error) {
    console.error('[Paystack Confirm] Error:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}
