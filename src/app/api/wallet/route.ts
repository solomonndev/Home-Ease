import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/wallet - Get wallet for authenticated user
// Falls back to computing earnings from Transaction table if Wallet table doesn't exist
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get wallet from Wallet table
    let wallet = null;
    let ledger: unknown[] = [];

    try {
      wallet = await db.wallet.findUnique({
        where: { userId: user.id },
      });

      if (wallet) {
        ledger = await db.walletTransaction.findMany({
          where: { walletId: wallet.id },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });
      }
    } catch (walletErr: unknown) {
      console.warn('[Wallet] Wallet table not available, computing from transactions:', walletErr instanceof Error ? walletErr.message : walletErr);
    }

    // If wallet exists, return it directly
    if (wallet) {
      return NextResponse.json({
        id: wallet.id,
        userId: wallet.userId,
        balance: wallet.balance,
        totalEarnings: wallet.totalEarnings,
        totalWithdrawn: wallet.totalWithdrawn,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
        ledger,
      });
    }

    // Fallback: compute earnings from Transaction table
    const provider = await db.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      return NextResponse.json({
        id: 'fallback',
        userId: user.id,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ledger: [],
        fallback: true,
      });
    }

    // Sum up completed/paid transactions
    const completedTxns = await db.transaction.findMany({
      where: {
        providerId: provider.id,
        status: { in: ['COMPLETED', 'ESCROW'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // balance = total paid out by admin (what provider can withdraw)
    const balance = completedTxns
      .filter(t => t.transferStatus === 'SUCCESS')
      .reduce((sum, t) => sum + (t.providerPayout || 0), 0);
    const totalEarnings = balance;
    const pendingPayout = completedTxns
      .filter(t => t.transferStatus !== 'SUCCESS')
      .reduce((sum, t) => sum + (t.providerPayout || 0), 0);

    // Build ledger from transactions
    const txLedger = completedTxns.slice(0, 20).map(t => ({
      id: t.id,
      type: t.transferStatus === 'SUCCESS' ? 'EARNING' : 'PENDING',
      amount: t.providerPayout,
      description: `${t.serviceRequest?.serviceType || 'Service'} - ${t.transferStatus === 'SUCCESS' ? 'Credited' : 'Pending'}`,
      balanceAfter: 0,
      createdAt: t.createdAt,
    }));

    return NextResponse.json({
      id: 'fallback',
      userId: user.id,
      balance,
      totalEarnings,
      totalWithdrawn: 0,
      pendingPayout,
      createdAt: new Date(),
      updatedAt: new Date(),
      ledger: txLedger,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Wallet GET error:', msg, error);
    return NextResponse.json({ error: 'Failed to fetch wallet', details: msg }, { status: 500 });
  }
}