import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// ONE-TIME USE: Clear all data except admin user and their provider profile
// DELETE /api/admin/clear-data?confirm=yes
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get('confirm') !== 'yes') {
      return NextResponse.json({ error: 'Add ?confirm=yes to proceed' }, { status: 400 });
    }

    const results: Record<string, number> = {};

    // Delete in reverse dependency order to respect foreign keys
    const wtx = await db.walletTransaction.deleteMany({ where: {} });
    results.walletTransactions = wtx.count;

    const wal = await db.wallet.deleteMany({ where: {} });
    results.wallets = wal.count;

    const al = await db.adminLog.deleteMany({});
    results.adminLogs = al.count;

    const not = await db.notification.deleteMany({});
    results.notifications = not.count;

    const fb = await db.feedback.deleteMany({});
    results.feedback = fb.count;

    const msg = await db.message.deleteMany({});
    results.messages = msg.count;

    const tx = await db.transaction.deleteMany({});
    results.transactions = tx.count;

    const sr = await db.serviceRequest.deleteMany({});
    results.serviceRequests = sr.count;

    const sm = await db.supportMessage.deleteMany({});
    results.supportMessages = sm.count;

    // Delete all providers except admin's
    const adminProvider = await db.provider.findUnique({ where: { userId: user.id } });
    const prov = await db.provider.deleteMany({
      where: adminProvider ? { id: { not: adminProvider.id } } : undefined,
    });
    results.providersDeleted = prov.count;
    results.adminProviderKept = adminProvider ? true : false;

    // Delete all users except admin
    const users = await db.user.deleteMany({
      where: { id: { not: user.id } },
    });
    results.usersDeleted = users.count;

    return NextResponse.json({
      success: true,
      message: 'All data cleared except admin account',
      adminEmail: user.email,
      deleted: results,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Clear data error:', msg, error);
    return NextResponse.json({ error: 'Failed to clear data', details: msg }, { status: 500 });
  }
}