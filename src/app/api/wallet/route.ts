import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/wallet - Get or create wallet for authenticated user with recent ledger entries
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create wallet
    let wallet = await db.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      wallet = await db.wallet.create({
        data: { userId: user.id },
      });
    }

    // Fetch recent 20 ledger entries ordered by createdAt desc
    const ledger = await db.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      totalEarnings: wallet.totalEarnings,
      totalWithdrawn: wallet.totalWithdrawn,
      totalCommission: wallet.totalCommission,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
      ledger,
    });
  } catch (error) {
    console.error('Wallet GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
}
