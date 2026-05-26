import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

const PLATFORM_FEE_PERCENT = 0.05;

// GET /api/payments/paystack/verify - Verify a Paystack transaction after payment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');

    if (!reference && !trxref) {
      return NextResponse.redirect(
        new URL('/?payment=failed&reason=no_reference', request.url)
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return NextResponse.redirect(
        new URL('/?payment=failed&reason=config_error', request.url)
      );
    }

    // Verify the transaction with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference || trxref || '')}`,
      {
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== 'success') {
      console.error('Paystack verification failed:', verifyData);
      return NextResponse.redirect(
        new URL('/?payment=failed&reason=verification_failed', request.url)
      );
    }

    const paymentData = verifyData.data;
    const metadata = paymentData.metadata || {};
    const requestId = metadata.requestId;
    const providerId = metadata.providerId;

    if (!requestId) {
      console.error('No requestId in Paystack metadata');
      return NextResponse.redirect(
        new URL('/?payment=failed&reason=missing_metadata', request.url)
      );
    }

    // Check if transaction already recorded
    const existingTx = await db.transaction.findUnique({ where: { requestId } });
    if (existingTx) {
      // Already processed, redirect to success
      return NextResponse.redirect(
        new URL('/?payment=success&requestId=' + requestId, request.url)
      );
    }

    // Get the service request
    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
      include: { provider: true }
    });

    if (!serviceRequest) {
      return NextResponse.redirect(
        new URL('/?payment=failed&reason=request_not_found', request.url)
      );
    }

    const amount = paymentData.amount / 100; // Convert from kobo to naira
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT);
    const providerPayout = amount - platformFee;

    // Create the transaction in escrow
    const transaction = await db.transaction.create({
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

    // Update service request payment status
    await db.serviceRequest.update({
      where: { id: requestId },
      data: { paymentStatus: 'HELD_IN_ESCROW' }
    });

    // Get provider and client info for notifications
    const provider = await db.provider.findUnique({
      where: { id: serviceRequest.providerId || providerId },
      include: { user: true }
    });
    const client = await db.user.findUnique({ where: { id: serviceRequest.clientId } });

    // Notify provider that payment is secured
    if (provider) {
      await db.notification.create({
        data: {
          userId: provider.userId,
          type: 'PAYMENT',
          title: 'Payment Secured in Escrow',
          message: `₦${amount.toLocaleString()} has been received from ${client?.name || 'a client'} and held in escrow for the ${serviceRequest.serviceType.toLowerCase()} service. You will receive ₦${providerPayout.toLocaleString()} in your bank account after completion.`,
        }
      });
    }

    // Notify client
    if (client) {
      await db.notification.create({
        data: {
          userId: client.id,
          type: 'PAYMENT',
          title: 'Payment Secured in Escrow',
          message: `Your payment of ₦${amount.toLocaleString()} for ${serviceRequest.serviceType.toLowerCase()} has been secured in escrow via Paystack. Payment will be released to the artisan's bank account after the work is completed.`,
        }
      });
    }

    // Redirect back to the app with success
    return NextResponse.redirect(
      new URL('/?payment=success&requestId=' + requestId, request.url)
    );
  } catch (error) {
    console.error('Paystack verify error:', error);
    return NextResponse.redirect(
      new URL('/?payment=failed&reason=server_error', request.url)
    );
  }
}

// POST /api/payments/paystack/verify - Webhook from Paystack
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Verify webhook signature
    const signature = request.headers.get('x-paystack-signature');
    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);

    // Handle charge.success event
    if (event.event === 'charge.success') {
      const paymentData = event.data;
      const metadata = paymentData.metadata || {};
      const requestId = metadata.requestId;
      const providerId = metadata.providerId;

      if (!requestId) {
        return NextResponse.json({ received: true });
      }

      // Check if transaction already recorded
      const existingTx = await db.transaction.findUnique({ where: { requestId } });
      if (existingTx) {
        return NextResponse.json({ received: true });
      }

      // Get the service request
      const serviceRequest = await db.serviceRequest.findUnique({
        where: { id: requestId },
        include: { provider: true }
      });

      if (!serviceRequest) {
        return NextResponse.json({ received: true });
      }

      const amount = paymentData.amount / 100; // Convert from kobo
      const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT);
      const providerPayout = amount - platformFee;

      // Create the transaction in escrow
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

      // Update service request payment status
      await db.serviceRequest.update({
        where: { id: requestId },
        data: { paymentStatus: 'HELD_IN_ESCROW' }
      });

      // Send notifications
      const provider = await db.provider.findUnique({
        where: { id: serviceRequest.providerId || providerId },
        include: { user: true }
      });
      const client = await db.user.findUnique({ where: { id: serviceRequest.clientId } });

      if (provider) {
        await db.notification.create({
          data: {
            userId: provider.userId,
            type: 'PAYMENT',
            title: 'Payment Secured in Escrow',
            message: `₦${amount.toLocaleString()} has been received and held in escrow for the ${serviceRequest.serviceType.toLowerCase()} service. You will receive ₦${providerPayout.toLocaleString()} after completion.`,
          }
        });
      }

      if (client) {
        await db.notification.create({
          data: {
            userId: client.id,
            type: 'PAYMENT',
            title: 'Payment Confirmed',
            message: `Your Paystack payment of ₦${amount.toLocaleString()} for ${serviceRequest.serviceType.toLowerCase()} has been confirmed and held in escrow.`,
          }
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
