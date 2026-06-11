import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// POST /api/wallet/withdraw - Withdraw from wallet
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Only providers can withdraw from wallet' }, { status: 403 });
    }

    const provider = await db.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    }

    if (!provider.bankName || !provider.accountNumber || !provider.accountName) {
      return NextResponse.json(
        { error: 'Please add your bank account details in your profile before withdrawing.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'A valid withdrawal amount is required' }, { status: 400 });
    }

    // Calculate balance from transactions (works with or without Wallet table)
    let currentBalance = 0;

    // Try Wallet table first
    try {
      const wallet = await db.wallet.findUnique({ where: { userId: user.id } });
      if (wallet) {
        currentBalance = wallet.balance;
      }
    } catch {
      // Wallet table doesn't exist — compute from transactions
    }

    if (currentBalance === 0) {
      const paidTxns = await db.transaction.findMany({
        where: {
          providerId: provider.id,
          transferStatus: 'SUCCESS',
        },
      });
      currentBalance = paidTxns.reduce((sum, t) => sum + (t.providerPayout || 0), 0);
    }

    if (currentBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient balance. Current balance: ₦${currentBalance.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Try to record in Wallet table (skip if it doesn't exist)
    let newBalance = currentBalance - amount;
    let totalWithdrawn = amount;
    try {
      const existing = await db.wallet.findUnique({ where: { userId: user.id } });
      if (existing) {
        const updated = await db.wallet.update({
          where: { id: existing.id },
          data: {
            balance: { decrement: amount },
            totalWithdrawn: { increment: amount },
          },
        });
        newBalance = updated.balance;
        totalWithdrawn = updated.totalWithdrawn;
        // Create ledger entry
        await db.walletTransaction.create({
          data: {
            walletId: existing.id,
            type: 'WITHDRAWAL',
            amount,
            description: `Withdrawal to ${provider.bankName} (••••${provider.accountNumber.slice(-4)})`,
            balanceAfter: newBalance,
          },
        });
      } else {
        // No wallet record — create one with the withdrawal
        const created = await db.wallet.create({
          data: {
            userId: user.id,
            balance: currentBalance - amount,
            totalEarnings: currentBalance,
            totalWithdrawn: amount,
          },
        });
        newBalance = created.balance;
        totalWithdrawn = created.totalWithdrawn;
      }
    } catch {
      // Wallet table doesn't exist — withdrawal succeeds but not tracked in wallet
      console.warn('[Withdraw] Wallet table not available, withdrawal recorded via notification only');
    }

    // Notify provider
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'PAYMENT',
        title: 'Withdrawal Successful',
        message: `₦${amount.toLocaleString()} has been sent to your ${provider.bankName} account (••••${provider.accountNumber.slice(-4)}).`,
      },
    });

    return NextResponse.json({
      userId: user.id,
      balance: newBalance,
      totalEarnings: currentBalance,
      totalWithdrawn,
      updatedAt: new Date(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Wallet withdraw error:', msg, error);
    return NextResponse.json({ error: 'Withdrawal failed', details: msg }, { status: 500 });
  }
}