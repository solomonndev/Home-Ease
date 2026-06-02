import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const PLATFORM_FEE_PERCENT = 0.05;

// POST /api/payments/paystack/confirm - Verify Paystack payment and record in DB (returns JSON, no redirect)
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
      return NextResponse.json({ error: 'Paystack not configured' }, { status: 500 });
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
      return NextResponse.json({
        success: true,
        message: 'Payment already recorded',
        requestId,
        status: existingTx.status,
        amount: existingTx.amount,
      });
    }

    // Step 3: Get the service request
    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
      include: { provider: true },
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    // Step 4: Record the transaction in escrow
    const amount = paymentData.amount / 100; // Convert from kobo to naira
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT);
    const providerPayout = amount - platformFee;

    await db.transaction.create({
      data: {
        requestId,
        clientId: serviceRequest.clientId,
        providerId: serviceRequest.providerId || providerId,
        amount,
        platformFee,
        providerPayout,
        paymentMethod: 'CARD',
        status: 'ESCROW',
      },
    });

    // Step 5: Update service request payment status
    await db.serviceRequest.update({
      where: { id: requestId },
      data: { paymentStatus: 'HELD_IN_ESCROW' },
    });

    // Step 6: Send notifications
    const provider = await db.provider.findUnique({
      where: { id: serviceRequest.providerId || providerId },
      include: { user: true },
    });
    const client = await db.user.findUnique({ where: { id: serviceRequest.clientId } });

    if (provider) {
      await db.notification.create({
        data: {
          userId: provider.userId,
          type: 'PAYMENT',
          title: 'Payment Secured in Escrow',
          message: `₦${amount.toLocaleString()} has been received from ${client?.name || 'a client'} and held in escrow for the ${serviceRequest.serviceType.toLowerCase()} service. You will receive ₦${providerPayout.toLocaleString()} in your bank account after the work is completed.`,
        },
      });
    }

    if (client) {
      await db.notification.create({
        data: {
          userId: client.id,
          type: 'PAYMENT',
          title: 'Payment Secured via Paystack',
          message: `Your payment of ₦${amount.toLocaleString()} for ${serviceRequest.serviceType.toLowerCase()} has been confirmed and held in escrow. The funds will be released to the artisan's bank account once the service is completed.`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed and held in escrow',
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
