import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// POST /api/wallet/withdraw - Withdraw from wallet (simulated)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user is a PROVIDER with a verified provider profile
    if (user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Only providers can withdraw from wallet' }, { status: 403 });
    }

    const provider = await db.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    }

    if (provider.verificationStatus !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'Provider profile must be verified before withdrawal' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'A valid withdrawal amount is required' }, { status: 400 });
    }

    // Get or create wallet
    let wallet = await db.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Check sufficient balance
    if (wallet.balance < amount) {
      return NextResponse.json(
        { error: `Insufficient balance. Current balance: ₦${wallet.balance.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Deduct from wallet balance, add to totalWithdrawn
    const updatedWallet = await db.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: amount },
        totalWithdrawn: { increment: amount },
      },
    });

    // Create WalletTransaction with type="WITHDRAWAL"
    const walletTx = await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'WITHDRAWAL',
        amount,
        description: 'Wallet withdrawal',
        balanceAfter: updatedWallet.balance,
      },
    });

    return NextResponse.json({
      id: updatedWallet.id,
      userId: updatedWallet.userId,
      balance: updatedWallet.balance,
      totalEarnings: updatedWallet.totalEarnings,
      totalWithdrawn: updatedWallet.totalWithdrawn,
      totalCommission: updatedWallet.totalCommission,
      updatedAt: updatedWallet.updatedAt,
      transaction: walletTx,
    });
  } catch (error) {
    console.error('Wallet withdraw POST error:', error);
    return NextResponse.json({ error: 'Withdrawal failed' }, { status: 500 });
  }
}
