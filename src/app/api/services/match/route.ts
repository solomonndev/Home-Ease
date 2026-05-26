import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/services/[id] - Get a specific service request
// PUT /api/services/[id] - Update service request status (accept, decline, complete, cancel)

// Intelligent matching algorithm
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        client: { select: { id: true, name: true, avatarUrl: true } },
      }
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    // Get all verified providers with matching skills
    const providers = await db.provider.findMany({
      where: {
        verificationStatus: 'VERIFIED',
        skills: { contains: serviceRequest.serviceType },
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, phone: true } }
      }
    });

    // Score each provider using weighted algorithm
    const scored = providers.map(provider => {
      let score = 0;

      // Skill match (40%) - exact match gets full points
      const skills = provider.skills.split(',');
      const hasExactSkill = skills.some(s => s.trim() === serviceRequest.serviceType);
      score += hasExactSkill ? 40 : 20;

      // Rating (20%) - 5 star = 20, 4 star = 16, etc.
      score += (provider.rating / 5) * 20;

      // Completed jobs (20%) - capped at 20
      const jobScore = Math.min(provider.completedJobs, 50) / 50 * 20;
      score += jobScore;

      // Availability (20%) - bonus for all-week availability
      const availBonus: Record<string, number> = { 'ALL_WEEK': 20, 'WEEKDAYS': 15, 'WEEKENDS': 15, 'CUSTOM': 10 };
      score += availBonus[provider.availability] || 10;

      return {
        provider: {
          ...provider,
          user: provider.user,
        },
        score: Math.round(score),
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      requestId,
      serviceType: serviceRequest.serviceType,
      matches: scored,
    });
  } catch (error) {
    console.error('Match error:', error);
    return NextResponse.json({ error: 'Matching failed' }, { status: 500 });
  }
}

// Accept/decline/match a provider to a request
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, providerId, action } = body; // action: 'accept', 'decline', 'complete', 'cancel', 'assign'

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Request ID and action are required' }, { status: 400 });
    }

    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
      include: { provider: true }
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    let updateData: any = {};

    switch (action) {
      case 'accept': {
        // Provider accepts the request
        if (user.role !== 'PROVIDER') {
          return NextResponse.json({ error: 'Only providers can accept requests' }, { status: 403 });
        }
        const provider = await db.provider.findUnique({ where: { userId: user.id } });
        if (!provider) {
          return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
        }
        updateData = {
          providerId: provider.id,
          status: 'ACCEPTED',
        };
        // Notify client
        await db.notification.create({
          data: {
            userId: serviceRequest.clientId,
            type: 'MATCH',
            title: 'Provider Accepted',
            message: `A provider has accepted your ${serviceRequest.serviceType.toLowerCase()} request`,
          }
        });
        break;
      }
      case 'decline': {
        if (user.role !== 'PROVIDER') {
          return NextResponse.json({ error: 'Only providers can decline requests' }, { status: 403 });
        }
        // Reset the request so it can be re-matched with another provider
        updateData = {
          providerId: null,
          status: 'PENDING',
          paymentStatus: 'PENDING',
        };

        // If there was an escrow payment, refund it
        const declineTx = await db.transaction.findUnique({ where: { requestId } });
        if (declineTx && declineTx.status === 'ESCROW') {
          await db.transaction.update({
            where: { id: declineTx.id },
            data: { status: 'REFUNDED' }
          });
        }

        await db.notification.create({
          data: {
            userId: serviceRequest.clientId,
            type: 'SERVICE_REQUEST',
            title: 'Provider Declined',
            message: `A provider declined your ${serviceRequest.serviceType.toLowerCase()} request. Your payment has been refunded and the request is available for re-matching.`,
          }
        });
        break;
      }
      case 'complete': {
        // Provider marks as completed — auto-release escrow payment to provider's bank account
        if (user.role !== 'PROVIDER') {
          return NextResponse.json({ error: 'Only providers can mark as complete' }, { status: 403 });
        }
        updateData = { status: 'COMPLETED' };

        // Auto-release escrow payment to provider's bank account for transparency
        const escrowTransaction = await db.transaction.findUnique({
          where: { requestId },
          include: {
            provider: { include: { user: { select: { id: true, name: true } } } },
          }
        });

        if (escrowTransaction && escrowTransaction.status === 'ESCROW') {
          // Release payment automatically
          await db.transaction.update({
            where: { id: escrowTransaction.id },
            data: {
              status: 'COMPLETED',
              paidOutAt: new Date(),
            }
          });

          // Update service request payment status
          updateData.paymentStatus = 'RELEASED';

          // Notify provider: payment released to their bank account
          if (escrowTransaction.provider.bankName && escrowTransaction.provider.accountNumber) {
            await db.notification.create({
              data: {
                userId: escrowTransaction.provider.user.id,
                type: 'PAYMENT',
                title: 'Payment Released to Your Account!',
                message: `₦${escrowTransaction.providerPayout.toLocaleString()} has been automatically released to your ${escrowTransaction.provider.bankName} account (${escrowTransaction.provider.accountNumber}) for the completed ${serviceRequest.serviceType.toLowerCase()} service. Platform fee: ₦${escrowTransaction.platformFee.toLocaleString()}.`,
              }
            });
          } else {
            await db.notification.create({
              data: {
                userId: escrowTransaction.provider.user.id,
                type: 'PAYMENT',
                title: 'Payment Ready for Payout!',
                message: `₦${escrowTransaction.providerPayout.toLocaleString()} is ready for payout. Please add your bank account details in your Profile to receive the payment.`,
              }
            });
          }

          // Notify client: payment auto-released to artisan
          await db.notification.create({
            data: {
              userId: serviceRequest.clientId,
              type: 'PAYMENT',
              title: 'Payment Released to Artisan',
              message: `₦${escrowTransaction.providerPayout.toLocaleString()} has been automatically released to ${escrowTransaction.provider.user.name}'s bank account for the completed ${serviceRequest.serviceType.toLowerCase()} service. The escrow ensured your money was safe until the work was done.`,
            }
          });
        }

        await db.notification.create({
          data: {
            userId: serviceRequest.clientId,
            type: 'SERVICE_REQUEST',
            title: 'Service Completed',
            message: `Your ${serviceRequest.serviceType.toLowerCase()} service has been marked as completed. Payment has been automatically released to the artisan. Please leave feedback.`,
          }
        });
        break;
      }
      case 'cancel': {
        if (user.role !== 'CLIENT') {
          return NextResponse.json({ error: 'Only clients can cancel requests' }, { status: 403 });
        }
        updateData = { status: 'CANCELLED' };

        // Auto-refund escrow payment if client cancels
        const cancelTx = await db.transaction.findUnique({
          where: { requestId },
          include: {
            provider: { include: { user: { select: { id: true, name: true } } } },
          }
        });
        if (cancelTx && cancelTx.status === 'ESCROW') {
          await db.transaction.update({
            where: { id: cancelTx.id },
            data: { status: 'REFUNDED' }
          });
          updateData.paymentStatus = 'REFUNDED';

          // Notify client about refund
          await db.notification.create({
            data: {
              userId: serviceRequest.clientId,
              type: 'PAYMENT',
              title: 'Refund Processed',
              message: `₦${cancelTx.amount.toLocaleString()} has been refunded to you for the cancelled ${serviceRequest.serviceType.toLowerCase()} service.`,
            }
          });

          // Notify provider about cancellation and refund
          if (cancelTx.provider?.user?.id) {
            await db.notification.create({
              data: {
                userId: cancelTx.provider.user.id,
                type: 'PAYMENT',
                title: 'Payment Refunded to Client',
                message: `₦${cancelTx.amount.toLocaleString()} has been refunded to the client for the cancelled ${serviceRequest.serviceType.toLowerCase()} service.`,
              }
            });
          }
        }

        if (serviceRequest.providerId) {
          const cancelProvider = await db.provider.findUnique({ where: { id: serviceRequest.providerId } });
          if (cancelProvider) {
            await db.notification.create({
              data: {
                userId: cancelProvider.userId,
                type: 'SERVICE_REQUEST',
                title: 'Request Cancelled',
                message: `A client has cancelled their ${serviceRequest.serviceType.toLowerCase()} request`,
              }
            });
          }
        }
        break;
      }
      case 'assign': {
        // Admin assigns provider
        if (user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Only admins can assign providers' }, { status: 403 });
        }
        if (!providerId) {
          return NextResponse.json({ error: 'Provider ID required for assignment' }, { status: 400 });
        }
        updateData = {
          providerId,
          status: 'MATCHED',
        };
        break;
      }
      case 'start': {
        updateData = { status: 'IN_PROGRESS' };
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await db.serviceRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        provider: { include: { user: { select: { id: true, name: true, avatarUrl: true, phone: true } } } },
      }
    });

    // Update provider completed jobs if service completed
    if (action === 'complete' && updated.providerId) {
      await db.provider.update({
        where: { id: updated.providerId },
        data: { completedJobs: { increment: 1 } }
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Service action error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
