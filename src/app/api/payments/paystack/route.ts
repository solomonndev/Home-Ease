import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const PLATFORM_FEE_PERCENT = 0.05; // 5% platform fee

// POST /api/payments/paystack - Initialize a Paystack transaction
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
      include: { provider: true }
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

    // Check if payment already exists
    const existingTx = await db.transaction.findUnique({ where: { requestId } });
    if (existingTx) {
      return NextResponse.json({
        alreadyPaid: true,
        status: existingTx.status,
        message: existingTx.status === 'ESCROW'
          ? 'Payment was already made and is held in escrow.'
          : existingTx.status === 'COMPLETED'
          ? 'Payment has already been completed.'
          : 'Payment already processed for this request.',
      }, { status: 200 });
    }

    const amount = serviceRequest.amount;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount. Please set a budget for this service.' }, { status: 400 });
    }

    // Initialize Paystack transaction
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error('[Paystack Init] PAYSTACK_SECRET_KEY not configured');
      return NextResponse.json({ error: 'Paystack is not configured. Please add PAYSTACK_SECRET_KEY to your Vercel environment variables (Settings → Environment Variables).' }, { status: 500 });
    }

    // Paystack amount is in kobo (multiply by 100)
    const amountInKobo = Math.round(amount * 100);

    const provider = await db.provider.findUnique({ where: { id: serviceRequest.providerId } });

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInKobo,
        reference: `HE-${requestId}-${Date.now()}`,
        metadata: {
          requestId,
          clientId: user.id,
          providerId: provider?.id,
          serviceType: serviceRequest.serviceType,
          custom_fields: [
            {
              display_name: 'Service Type',
              variable_name: 'service_type',
              value: serviceRequest.serviceType,
            },
            {
              display_name: 'Request ID',
              variable_name: 'request_id',
              value: requestId,
            },
          ]
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Paystack initialization error:', paystackData);
      return NextResponse.json({
        error: 'Failed to initialize payment. Please try again.',
        details: paystackData.message
      }, { status: 400 });
    }

    return NextResponse.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      accessCode: paystackData.data.access_code,
      amount,
      requestId,
      email: user.email,
    });
  } catch (error) {
    console.error('Paystack init error:', error);
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
  }
}
