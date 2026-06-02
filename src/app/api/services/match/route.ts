import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const PLATFORM_FEE_PERCENT = 0.05; // 5% platform fee

// GET /api/services/match - Intelligent matching algorithm
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

// POST /api/services/match - Actions: accept, decline, checkin, checkout, complete, cancel, assign
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, providerId, action } = body;

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Request ID and action are required' }, { status: 400 });
    }

    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        provider: true,
        client: { select: { id: true, name: true } },
      }
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    let updateData: any = {};

    switch (action) {
      case 'accept': {
        // Provider accepts the booking
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
            title: 'Provider Accepted Your Booking',
            message: `${user.name} has accepted your ${serviceRequest.serviceType.toLowerCase()} request. They will check in when they arrive on the scheduled date.`,
          }
        });
        break;
      }
      case 'decline': {
        if (user.role !== 'PROVIDER') {
          return NextResponse.json({ error: 'Only providers can decline requests' }, { status: 403 });
        }
        // Reset the request so it can be re-matched
        updateData = {
          providerId: null,
          status: 'PENDING',
          paymentStatus: 'PENDING',
        };

        await db.notification.create({
          data: {
            userId: serviceRequest.clientId,
            type: 'SERVICE_REQUEST',
            title: 'Provider Declined',
            message: `${user.name} declined your ${serviceRequest.serviceType.toLowerCase()} request. You can try booking another provider.`,
          }
        });
        break;
      }

      case 'checkin': {
        // Artisan checks in — timer starts, service begins
        if (user.role !== 'PROVIDER') {
          return NextResponse.json({ error: 'Only providers can check in' }, { status: 403 });
        }
        if (serviceRequest.status !== 'ACCEPTED') {
          return NextResponse.json({ error: 'Request must be accepted before checking in' }, { status: 400 });
        }

        const now = new Date();
        updateData = {
          status: 'IN_PROGRESS',
          checkInTime: now,
        };

        // Notify client that artisan has started
        await db.notification.create({
          data: {
            userId: serviceRequest.clientId,
            type: 'SERVICE_REQUEST',
            title: 'Artisan Has Started!',
            message: `${user.name} has checked in and started your ${serviceRequest.serviceType.toLowerCase()} service. The timer is now running.`,
          }
        });
        break;
      }

      case 'checkout': {
        // Artisan checks out — timer stops, calculate total, request payment from client
        if (user.role !== 'PROVIDER') {
          return NextResponse.json({ error: 'Only providers can check out' }, { status: 403 });
        }
        if (serviceRequest.status !== 'IN_PROGRESS') {
          return NextResponse.json({ error: 'Service must be in progress to check out' }, { status: 400 });
        }
        if (!serviceRequest.checkInTime) {
          return NextResponse.json({ error: 'No check-in time recorded' }, { status: 400 });
        }

        const now = new Date();
        const elapsedMs = now.getTime() - new Date(serviceRequest.checkInTime).getTime();
        const rawHours = elapsedMs / (1000 * 60 * 60);
        const elapsedHours = Math.max(1, Math.ceil(rawHours)); // Minimum 1 hour, billed per hour (any partial hour rounds up)

        // Get provider's hourly rate
        const provider = await db.provider.findUnique({
          where: { id: serviceRequest.providerId! },
          include: { user: { select: { id: true, name: true } } },
        });

        const hourlyRate = provider?.hourlyRate || 0;
        const totalAmount = Math.round(elapsedHours * hourlyRate);
        const platformFee = Math.round(totalAmount * PLATFORM_FEE_PERCENT);
        const providerPayout = totalAmount - platformFee;

        updateData = {
          status: 'AWAITING_PAYMENT',
          checkOutTime: now,
          totalHours: elapsedHours,
          amount: totalAmount,
        };

        // Notify client to make payment
        await db.notification.create({
          data: {
            userId: serviceRequest.clientId,
            type: 'PAYMENT',
            title: 'Service Complete — Payment Required',
            message: `${user.name} has completed your ${serviceRequest.serviceType.toLowerCase()} service. Time worked: ${elapsedHours} hour${elapsedHours > 1 ? 's' : ''}. Total: ₦${totalAmount.toLocaleString()}. Please make payment to release funds to the artisan.`,
          }
        });

        // Notify provider that client has been asked to pay
        await db.notification.create({
          data: {
            userId: user.id,
            type: 'PAYMENT',
            title: 'Awaiting Client Payment',
            message: `You completed the ${serviceRequest.serviceType.toLowerCase()} service (${elapsedHours} hour${elapsedHours > 1 ? 's' : ''}). Total bill: ₦${totalAmount.toLocaleString()} (₦${platformFee.toLocaleString()} platform fee). Your payout: ₦${providerPayout.toLocaleString()}. Waiting for client to pay.`,
          }
        });
        break;
      }

      case 'complete': {
        // This is now triggered automatically when client pays
        // Kept for backward compatibility
        if (user.role !== 'PROVIDER') {
          return NextResponse.json({ error: 'Only providers can mark as complete' }, { status: 403 });
        }
        updateData = { status: 'COMPLETED' };

        // Auto-release escrow payment if exists
        const escrowTransaction = await db.transaction.findUnique({
          where: { requestId },
          include: {
            provider: { include: { user: { select: { id: true, name: true } } } },
          }
        });

        if (escrowTransaction && escrowTransaction.status === 'ESCROW') {
          // --- ACTUAL BANK TRANSFER VIA PAYSTACK ---
          let transferSuccess = false;
          let transferRef: string | null = null;
          let transferStatus: string | null = null;

          if (escrowTransaction.provider.bankName && escrowTransaction.provider.accountNumber) {
            const { sendToBank } = await import('@/lib/paystack-transfer');
            const result = await sendToBank({
              bankName: escrowTransaction.provider.bankName,
              accountNumber: escrowTransaction.provider.accountNumber,
              accountName: escrowTransaction.provider.accountName || escrowTransaction.provider.user.name,
              amountInNaira: escrowTransaction.providerPayout,
              requestId,
              serviceType: serviceRequest.serviceType,
            });
            transferSuccess = result.success;
            transferRef = result.reference || null;
            transferStatus = result.transferStatus || null;
          }

          await db.transaction.update({
            where: { id: escrowTransaction.id },
            data: {
              status: transferSuccess ? 'COMPLETED' : 'ESCROW',
              paidOutAt: transferSuccess ? new Date() : null,
              transferRef,
              transferStatus: transferStatus || (transferSuccess ? 'PENDING' : 'FAILED'),
            }
          });

          if (transferSuccess) {
            updateData.paymentStatus = 'RELEASED';

            if (escrowTransaction.provider.bankName && escrowTransaction.provider.accountNumber) {
              await db.notification.create({
                data: {
                  userId: escrowTransaction.provider.user.id,
                  type: 'PAYMENT',
                  title: 'Payment Transferred to Your Bank! 💰',
                  message: `₦${escrowTransaction.providerPayout.toLocaleString()} has been transferred to your ${escrowTransaction.provider.bankName} account (${escrowTransaction.provider.accountNumber}). Transfer ref: ${transferRef || 'N/A'}. Status: ${transferStatus || 'processing'}. Money should arrive within 1-24 hours. Platform fee: ₦${escrowTransaction.platformFee.toLocaleString()}.`,
                }
              });
            }

            await db.notification.create({
              data: {
                userId: serviceRequest.clientId,
                type: 'PAYMENT',
                title: 'Payment Released to Artisan',
                message: `₦${escrowTransaction.providerPayout.toLocaleString()} has been transferred to ${escrowTransaction.provider.user.name}'s ${escrowTransaction.provider.bankName || 'bank'} account. Transfer ref: ${transferRef || 'N/A'}. Platform fee: ₦${escrowTransaction.platformFee.toLocaleString()}.`,
              }
            });
          } else {
            // Transfer failed — notify admin and provider
            await db.notification.create({
              data: {
                userId: escrowTransaction.provider.user.id,
                type: 'PAYMENT',
                title: 'Payment Transfer Pending',
                message: `₦${escrowTransaction.providerPayout.toLocaleString()} is ready for your account but the automatic bank transfer failed. Please verify your bank details in Profile. An admin can release the payment manually.`,
              }
            });
          }
        }

        await db.notification.create({
          data: {
            userId: serviceRequest.clientId,
            type: 'SERVICE_REQUEST',
            title: 'Service Completed',
            message: `Your ${serviceRequest.serviceType.toLowerCase()} service has been completed. Please leave feedback.`,
          }
        });
        break;
      }
      case 'cancel': {
        if (user.role !== 'CLIENT') {
          return NextResponse.json({ error: 'Only clients can cancel requests' }, { status: 403 });
        }
        updateData = { status: 'CANCELLED' };

        // If there was an escrow payment, refund it
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

          await db.notification.create({
            data: {
              userId: serviceRequest.clientId,
              type: 'PAYMENT',
              title: 'Refund Processed',
              message: `₦${cancelTx.amount.toLocaleString()} has been refunded for the cancelled ${serviceRequest.serviceType.toLowerCase()} service.`,
            }
          });

          if (cancelTx.provider?.user?.id) {
            await db.notification.create({
              data: {
                userId: cancelTx.provider.user.id,
                type: 'PAYMENT',
                title: 'Booking Cancelled',
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
                title: 'Booking Cancelled',
                message: `A client has cancelled their ${serviceRequest.serviceType.toLowerCase()} booking.`,
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
        // Legacy: mapped to checkin for backward compatibility
        if (serviceRequest.status !== 'ACCEPTED') {
          return NextResponse.json({ error: 'Request must be accepted before starting' }, { status: 400 });
        }
        const now = new Date();
        updateData = {
          status: 'IN_PROGRESS',
          checkInTime: now,
        };

        await db.notification.create({
          data: {
            userId: serviceRequest.clientId,
            type: 'SERVICE_REQUEST',
            title: 'Artisan Has Started!',
            message: `${user.name} has checked in and started your ${serviceRequest.serviceType.toLowerCase()} service. The timer is now running.`,
          }
        });
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
        transaction: true,
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
