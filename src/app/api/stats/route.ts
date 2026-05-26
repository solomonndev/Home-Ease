import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const PLATFORM_FEE_PERCENT = 0.05;

const PROVIDER_DEFAULTS = {
  totalAssignments: 0,
  activeJobs: 0,
  completedJobs: 0,
  totalEarnings: 0,
  pendingEarnings: 0,
  totalPlatformFees: 0,
  rating: 0,
  totalReviews: 0,
  verificationStatus: 'PENDING',
  jobOffers: [],
  hasBankDetails: false,
  bankName: null,
  accountNumber: null,
  accountName: null,
  platformFeeRate: PLATFORM_FEE_PERCENT,
};

// GET /api/stats - Dashboard stats for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'CLIENT') {
      try {
        const [totalRequests, pendingRequests, activeRequests, completedRequests, totalSpent] = await Promise.all([
          db.serviceRequest.count({ where: { clientId: user.id } }),
          db.serviceRequest.count({ where: { clientId: user.id, status: 'PENDING' } }),
          db.serviceRequest.count({ where: { clientId: user.id, status: { in: ['ACCEPTED', 'IN_PROGRESS'] } } }),
          db.serviceRequest.count({ where: { clientId: user.id, status: 'COMPLETED' } }),
          db.transaction.aggregate({ where: { clientId: user.id, status: 'COMPLETED' }, _sum: { amount: true } }),
        ]);

        const recentRequests = await db.serviceRequest.findMany({
          where: { clientId: user.id },
          include: {
            provider: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
            transaction: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        // Payment transparency data
        const escrowHeld = await db.transaction.aggregate({
          where: { clientId: user.id, status: 'ESCROW' },
          _sum: { amount: true },
        });

        const feedbacks = await db.feedback.findMany({
          where: { clientId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        return NextResponse.json({
          totalRequests,
          pendingRequests,
          activeRequests,
          completedRequests,
          totalSpent: totalSpent._sum.amount || 0,
          totalInEscrow: escrowHeld._sum.amount || 0,
          recentRequests,
          feedbacks,
          platformFeeRate: PLATFORM_FEE_PERCENT,
        });
      } catch (queryError) {
        console.error('Client stats query error:', queryError);
        // Return safe defaults instead of 500 error
        return NextResponse.json({
          totalRequests: 0,
          pendingRequests: 0,
          activeRequests: 0,
          completedRequests: 0,
          totalSpent: 0,
          totalInEscrow: 0,
          recentRequests: [],
          feedbacks: [],
          platformFeeRate: PLATFORM_FEE_PERCENT,
        });
      }
    }

    if (user.role === 'PROVIDER') {
      // Find provider record — wrapped in its own try-catch to avoid falling through
      let provider;
      try {
        provider = await db.provider.findUnique({ where: { userId: user.id } });
      } catch (providerLookupError) {
        console.error('Provider lookup error:', providerLookupError);
        return NextResponse.json(PROVIDER_DEFAULTS);
      }

      if (!provider) {
        // Return safe defaults — provider profile may still be creating
        return NextResponse.json(PROVIDER_DEFAULTS);
      }

      try {
        const [totalAssignments, activeJobs, completedJobs, totalEarnings, pendingEarnings] = await Promise.all([
          db.serviceRequest.count({ where: { providerId: provider.id } }),
          db.serviceRequest.count({ where: { providerId: provider.id, status: { in: ['ACCEPTED', 'IN_PROGRESS'] } } }),
          db.serviceRequest.count({ where: { providerId: provider.id, status: 'COMPLETED' } }),
          db.transaction.aggregate({ where: { providerId: provider.id, status: 'COMPLETED' }, _sum: { providerPayout: true } }),
          db.transaction.aggregate({ where: { providerId: provider.id, status: 'ESCROW' }, _sum: { providerPayout: true } }),
        ]);

        // Total platform fees collected
        const totalPlatformFees = await db.transaction.aggregate({
          where: { providerId: provider.id, status: { in: ['COMPLETED', 'ESCROW'] } },
          _sum: { platformFee: true },
        });

        // Job offers: MATCHED requests assigned to this provider
        const jobOffers = await db.serviceRequest.findMany({
          where: {
            providerId: provider.id,
            status: 'MATCHED',
          },
          include: {
            client: { select: { id: true, name: true, avatarUrl: true, phone: true } },
            transaction: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        // Bank account status for payout
        const hasBankDetails = !!(provider.bankName && provider.accountNumber && provider.accountName);

        return NextResponse.json({
          totalAssignments,
          activeJobs,
          completedJobs,
          totalEarnings: totalEarnings._sum.providerPayout || 0,
          pendingEarnings: pendingEarnings._sum.providerPayout || 0,
          totalPlatformFees: totalPlatformFees._sum.platformFee || 0,
          rating: provider.rating,
          totalReviews: provider.totalReviews,
          verificationStatus: provider.verificationStatus,
          jobOffers,
          hasBankDetails,
          bankName: provider.bankName,
          accountNumber: provider.accountNumber ? `****${provider.accountNumber.slice(-4)}` : null,
          accountName: provider.accountName,
          platformFeeRate: PLATFORM_FEE_PERCENT,
        });
      } catch (innerError) {
        console.error('Provider stats query error:', innerError);
        // Return safe defaults on query failure — UI can still render
        return NextResponse.json({
          totalAssignments: 0,
          activeJobs: 0,
          completedJobs: 0,
          totalEarnings: 0,
          pendingEarnings: 0,
          totalPlatformFees: 0,
          rating: provider.rating || 0,
          totalReviews: provider.totalReviews || 0,
          verificationStatus: provider.verificationStatus || 'PENDING',
          jobOffers: [],
          hasBankDetails: !!(provider.bankName && provider.accountNumber && provider.accountName),
          bankName: provider.bankName,
          accountNumber: provider.accountNumber ? `****${provider.accountNumber.slice(-4)}` : null,
          accountName: provider.accountName,
          platformFeeRate: PLATFORM_FEE_PERCENT,
        });
      }
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  } catch (error) {
    console.error('Stats GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
