import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// ONE-TIME: Create missing Wallet + WalletTransaction tables in Supabase
// DELETE /api/admin/setup-tables?confirm=yes
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get('confirm') !== 'yes') {
      return NextResponse.json({ error: 'Add ?confirm=yes' }, { status: 400 });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Get the database URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    // Use raw SQL to create the tables (works even if Prisma schema is out of sync)
    const sql = `
      CREATE TABLE IF NOT EXISTS "Wallet" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalWithdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Wallet_userId_key" UNIQUE("userId")
      );

      CREATE TABLE IF NOT EXISTS "WalletTransaction" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "walletId" TEXT NOT NULL,
        "type" VARCHAR(30) NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "description" TEXT,
        "reference" TEXT,
        "balanceAfter" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");

      ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;

    await prisma.$executeRawUnsafe(sql);
    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: 'Wallet and WalletTransaction tables created successfully',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Setup tables error:', msg, error);
    return NextResponse.json({ error: 'Failed to create tables', details: msg }, { status: 500 });
  }
}