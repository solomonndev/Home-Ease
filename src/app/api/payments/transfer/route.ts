import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import crypto from 'crypto';

// POST /api/payments/transfer - Webhook from Paystack for transfer status updates
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

    // Handle transfer events
    if (event.event === 'transfer.success' || event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
      const transferData = event.data;
      const transferRef = transferData.reference;

      if (!transferRef) {
        return NextResponse.json({ received: true });
      }

      // Find the transaction by transfer reference
      const transaction = await db.transaction.findFirst({
        where: { transferRef },
        include: {
          serviceRequest: true,
          provider: { include: { user: true } },
        }
      });

      if (!transaction) {
        console.warn(`No transaction found for transfer ref: ${transferRef}`);
        return NextResponse.json({ received: true });
      }

      const provider = transaction.provider;
      const isSuccess = event.event === 'transfer.success';
      const isFailed = event.event === 'transfer.failed';
      const isReversed = event.event === 'transfer.reversed';

      let newTransferStatus: string;
      let newTxStatus: string;
      let newPaymentStatus: string;
      let paidOutAt: Date | null = null;

      if (isSuccess) {
        newTransferStatus = 'SUCCESS';
        newTxStatus = 'COMPLETED';
        newPaymentStatus = 'RELEASED';
        paidOutAt = new Date();
      } else if (isFailed) {
        newTransferStatus = 'FAILED';
        newTxStatus = transaction.status; // Keep existing
        newPaymentStatus = transaction.serviceRequest?.paymentStatus || transaction.status;
      } else if (isReversed) {
        newTransferStatus = 'REVERSED';
        newTxStatus = transaction.status;
        newPaymentStatus = transaction.serviceRequest?.paymentStatus || transaction.status;
      } else {
        return NextResponse.json({ received: true });
      }

      // Update transaction
      await db.transaction.update({
        where: { id: transaction.id },
        data: {
          transferStatus: newTransferStatus,
          paidOutAt,
          ...(isSuccess ? { status: newTxStatus } : {}),
        }
      });

      // Update service request payment status
      if (transaction.serviceRequest && isSuccess) {
        await db.serviceRequest.update({
          where: { id: transaction.serviceRequest.id },
          data: { paymentStatus: newPaymentStatus },
        });
      }

      // Notify provider
      if (provider) {
        if (isSuccess) {
          await db.notification.create({
            data: {
              userId: provider.userId,
              type: 'PAYMENT',
              title: 'Payout Successful',
              message: `₦${transaction.providerPayout.toLocaleString()} has been successfully transferred to your ${provider.bankName} account (••••${provider.accountNumber?.slice(-4)}). Reference: ${transferRef.slice(-8)}`,
            }
          });
        } else if (isFailed) {
          await db.notification.create({
            data: {
              userId: provider.userId,
              type: 'SYSTEM_ALERT',
              title: 'Payout Failed',
              message: `The transfer of ₦${transaction.providerPayout.toLocaleString()} to your bank account failed. Please contact support or update your bank details. Reference: ${transferRef.slice(-8)}`,
            }
          });
        } else if (isReversed) {
          await db.notification.create({
            data: {
              userId: provider.userId,
              type: 'SYSTEM_ALERT',
              title: 'Payout Reversed',
              message: `The transfer of ₦${transaction.providerPayout.toLocaleString()} to your bank account was reversed. Please contact support. Reference: ${transferRef.slice(-8)}`,
            }
          });
        }
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Transfer webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// GET /api/payments/transfer - Verify a transfer status (manual check)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.json({ error: 'Paystack not configured' }, { status: 500 });
    }

    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || !transaction.transferRef) {
      return NextResponse.json({ error: 'No transfer reference found for this transaction' }, { status: 404 });
    }

    // Verify transfer status with Paystack
    const verifyResponse = await fetch(
      `${process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co'}/transfer/${encodeURIComponent(transaction.transferRef)}`,
      {
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.status) {
      return NextResponse.json({ error: 'Failed to verify transfer' }, { status: 400 });
    }

    const transferStatus = verifyData.data.status; // pending, processing, success, failed, reversed

    // Update local status
    await db.transaction.update({
      where: { id: transactionId },
      data: {
        transferStatus: transferStatus.toUpperCase(),
        ...(transferStatus === 'success' ? { paidOutAt: new Date(), status: 'COMPLETED' } : {}),
      }
    });

    return NextResponse.json({
      reference: transaction.transferRef,
      status: transferStatus,
      amount: transaction.providerPayout,
    });
  } catch (error) {
    console.error('Transfer verify error:', error);
    return NextResponse.json({ error: 'Transfer verification failed' }, { status: 500 });
  }
}
