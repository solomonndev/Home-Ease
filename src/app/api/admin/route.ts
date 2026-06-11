import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/admin - Admin dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'pending-verifications') {
      const pending = await db.provider.findMany({
        where: { verificationStatus: 'PENDING' },
        include: { user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return NextResponse.json(pending);
    }

    if (action === 'all-users') {
      const users = await db.user.findMany({
        include: { provider: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(users);
    }

    if (action === 'all-requests') {
      const requests = await db.serviceRequest.findMany({
        include: {
          client: { select: { id: true, name: true, email: true } },
          provider: { include: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(requests);
    }

    if (action === 'disputes') {
      // Find cancelled or refunded requests as disputes
      const disputes = await db.serviceRequest.findMany({
        where: {
          OR: [
            { status: 'CANCELLED' },
            { paymentStatus: 'REFUNDED' },
          ]
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
          provider: { include: { user: { select: { id: true, name: true } } } },
          transaction: true,
          feedback: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
      return NextResponse.json(disputes);
    }

    if (action === 'logs') {
      const logs = await db.adminLog.findMany({
        include: { admin: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return NextResponse.json(logs);
    }

    // Default: return dashboard summary
    const [
      totalUsers,
      totalClients,
      totalProviders,
      totalRequests,
      pendingRequests,
      completedRequests,
      totalTransactions,
      totalRevenue,
      totalPlatformFees,
      pendingVerifications,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: 'CLIENT' } }),
      db.user.count({ where: { role: 'PROVIDER' } }),
      db.serviceRequest.count(),
      db.serviceRequest.count({ where: { status: 'PENDING' } }),
      db.serviceRequest.count({ where: { status: 'COMPLETED' } }),
      db.transaction.count(),
      db.transaction.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      db.transaction.aggregate({ where: { status: 'COMPLETED' }, _sum: { platformFee: true } }),
      db.provider.count({ where: { verificationStatus: 'PENDING' } }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalClients,
      totalProviders,
      totalRequests,
      pendingRequests,
      completedRequests,
      totalTransactions,
      totalRevenue: totalRevenue._sum.amount || 0,
      totalPlatformFees: totalPlatformFees._sum.platformFee || 0,
      pendingVerifications,
    });
  } catch (error) {
    console.error('Admin GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin data' }, { status: 500 });
  }
}

// POST /api/admin - Admin actions (verify, suspend, etc.)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, targetId, details } = body;

    if (!action || !targetId) {
      return NextResponse.json({ error: 'Action and target ID are required' }, { status: 400 });
    }

    let logAction = '';

    switch (action) {
      case 'verify-provider': {
        await db.provider.update({
          where: { id: targetId },
          data: { verificationStatus: 'VERIFIED' }
        });
        const provider = await db.provider.findUnique({ where: { id: targetId } });
        if (provider) {
          await db.notification.create({
            data: {
              userId: provider.userId,
              type: 'SYSTEM_ALERT',
              title: 'Profile Verified',
              message: 'Your provider profile has been verified. You can now receive service requests.',
            }
          });
        }
        logAction = 'VERIFY_PROVIDER';
        break;
      }
      case 'reject-provider': {
        await db.provider.update({
          where: { id: targetId },
          data: { verificationStatus: 'REJECTED' }
        });
        logAction = 'REJECT_PROVIDER';
        break;
      }
      case 'suspend-user': {
        await db.user.update({
          where: { id: targetId },
          data: { status: 'SUSPENDED' }
        });
        logAction = 'SUSPEND_USER';
        break;
      }
      case 'activate-user': {
        await db.user.update({
          where: { id: targetId },
          data: { status: 'ACTIVE' }
        });
        logAction = 'ACTIVATE_USER';
        break;
      }
      case 'delete-user': {
        // Prevent self-deletion
        if (targetId === user.id) {
          return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        // Check if target is the last admin
        const targetUser = await db.user.findUnique({ where: { id: targetId } });
        if (!targetUser) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        if (targetUser.role === 'ADMIN') {
          const adminCount = await db.user.count({ where: { role: 'ADMIN' } });
          if (adminCount <= 1) {
            return NextResponse.json({ error: 'Cannot delete the last admin account' }, { status: 400 });
          }
        }

        // Get provider ID if exists
        const provider = await db.provider.findUnique({ where: { userId: targetId } });

        // Delete related records in dependency order
        await db.adminLog.deleteMany({ where: { adminId: targetId } });
        
        // Delete feedback where user is client or provider
        if (provider) {
          await db.feedback.deleteMany({ where: { providerId: provider.id } });
        }
        await db.feedback.deleteMany({ where: { clientId: targetId } });

        // Delete transactions where user is client or provider
        if (provider) {
          // Null out provider references in transactions first
          await db.transaction.deleteMany({ where: { providerId: provider.id } });
        }
        await db.transaction.deleteMany({ where: { clientId: targetId } });

        // Delete messages (sender relation)
        await db.message.deleteMany({ where: { senderId: targetId } });

        // Delete service requests (client relation)
        // First delete messages on those requests, then feedback, then transactions, then requests
        const requests = await db.serviceRequest.findMany({
          where: { clientId: targetId },
          select: { id: true }
        });
        const requestIds = requests.map(r => r.id);
        if (requestIds.length > 0) {
          await db.message.deleteMany({ where: { requestId: { in: requestIds } } });
          await db.feedback.deleteMany({ where: { requestId: { in: requestIds } } });
          await db.transaction.deleteMany({ where: { requestId: { in: requestIds } } });
          await db.serviceRequest.deleteMany({ where: { id: { in: requestIds } } });
        }

        // Also handle requests assigned to this provider
        if (provider) {
          const assignedRequests = await db.serviceRequest.findMany({
            where: { providerId: provider.id },
            select: { id: true }
          });
          const assignedIds = assignedRequests.map(r => r.id);
          if (assignedIds.length > 0) {
            await db.message.deleteMany({ where: { requestId: { in: assignedIds } } });
            await db.feedback.deleteMany({ where: { requestId: { in: assignedIds } } });
            await db.transaction.deleteMany({ where: { requestId: { in: assignedIds } } });
            await db.serviceRequest.updateMany({
              where: { id: { in: assignedIds } },
              data: { providerId: null }
            });
          }
        }

        // Notifications have onDelete: Cascade, but delete explicitly to be safe
        await db.notification.deleteMany({ where: { userId: targetId } });

        // Finally delete the user
        await db.user.delete({ where: { id: targetId } });
        logAction = 'DELETE_USER';
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Log admin action
    await db.adminLog.create({
      data: {
        adminId: user.id,
        action: logAction,
        details: details || `Action: ${action}, Target: ${targetId}`,
      }
    });

    return NextResponse.json({ success: true, action: logAction });
  } catch (error) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ error: 'Admin action failed' }, { status: 500 });
  }
}
