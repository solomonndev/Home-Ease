import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, SERVICE_TYPES } from '@/lib/auth';

const PLATFORM_FEE_PERCENT = 0.05; // 5% platform fee

// GET /api/services - List service requests (filtered by role)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    let where: any = {};

    if (user.role === 'CLIENT') {
      where.clientId = user.id;
    } else if (user.role === 'PROVIDER') {
      const provider = await db.provider.findUnique({ where: { userId: user.id } });
      if (!provider) {
        where.status = 'PENDING';
      } else {
        where = {
          providerId: provider.id,
        };
      }
    }

    if (status) where.status = status;
    if (type) where.serviceType = type;

    const [requests, total] = await Promise.all([
      db.serviceRequest.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, avatarUrl: true, phone: true } },
          provider: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          feedback: true,
          transaction: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.serviceRequest.count({ where })
    ]);

    return NextResponse.json({ requests, total, page, limit });
  } catch (error) {
    console.error('Services GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

// POST /api/services - Create a service request WITH payment on the portal
// Payment is held in escrow for safety — paid to artisan's bank account after work is completed
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Only clients can create service requests' }, { status: 403 });
    }

    const body = await request.json();
    const { serviceType, description, location, requestedDate, requestedTime, amount, providerId, paymentMethod } = body;

    if (!serviceType || !location || !requestedDate || !requestedTime) {
      return NextResponse.json(
        { error: 'Service type, location, date, and time are required' },
        { status: 400 }
      );
    }

    // If a specific provider is chosen, validate and assign directly
    let assignedProviderId = providerId || null;
    let initialStatus = 'PENDING';
    let initialPaymentStatus = 'PENDING';

    if (assignedProviderId) {
      const provider = await db.provider.findUnique({
        where: { id: assignedProviderId },
        include: { user: { select: { id: true } } },
      });

      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }

      if (provider.verificationStatus !== 'VERIFIED') {
        return NextResponse.json({ error: 'Provider is not verified' }, { status: 400 });
      }

      // Check provider offers this service (flexible matching for free-text skills)
      const providerSkills = provider.skills.split(',').map(s => s.trim().toLowerCase());
      const serviceTypeLower = serviceType.toLowerCase();
      const hasMatchingSkill = providerSkills.some(skill =>
        skill === serviceTypeLower ||
        skill.includes(serviceTypeLower) ||
        serviceTypeLower.includes(skill)
      );
      if (!hasMatchingSkill) {
        return NextResponse.json({ error: 'Provider does not offer this service' }, { status: 400 });
      }

      initialStatus = 'MATCHED';
    }

    const paymentAmount = amount || 0;

    // When Paystack is configured, don't auto-create escrow transaction here.
    // Paystack will handle the payment flow via /api/payments/paystack
    const paystackConfigured = !!process.env.PAYSTACK_SECRET_KEY;

    // Only auto-create escrow if Paystack is NOT configured (mock mode)
    if (assignedProviderId && paymentAmount > 0 && !paystackConfigured) {
      initialPaymentStatus = 'HELD_IN_ESCROW';
    }

    const serviceRequest = await db.serviceRequest.create({
      data: {
        clientId: user.id,
        providerId: assignedProviderId,
        serviceType,
        description: description || null,
        location,
        requestedDate: new Date(requestedDate),
        requestedTime,
        amount: paymentAmount,
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
      },
      include: {
        client: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        provider: { include: { user: { select: { id: true, name: true, avatarUrl: true, phone: true } } } },
      }
    });

    // Only auto-create escrow transaction if Paystack is NOT configured (mock mode)
    // When Paystack is configured, payment will be created after Paystack verification
    if (assignedProviderId && paymentAmount > 0 && !paystackConfigured) {
      const platformFee = Math.round(paymentAmount * PLATFORM_FEE_PERCENT);
      const providerPayout = paymentAmount - platformFee;

      await db.transaction.create({
        data: {
          requestId: serviceRequest.id,
          clientId: user.id,
          providerId: assignedProviderId,
          amount: paymentAmount,
          platformFee,
          providerPayout,
          paymentMethod: paymentMethod || 'CARD',
          status: 'ESCROW',
        }
      });

      // Notify provider that payment is secured in escrow
      if (serviceRequest.provider) {
        await db.notification.create({
          data: {
            userId: serviceRequest.provider.user.id,
            type: 'PAYMENT',
            title: 'Payment Secured in Escrow',
            message: `₦${paymentAmount.toLocaleString()} has been received from ${user.name} and held in escrow for the ${serviceType.toLowerCase()} service. You will automatically receive ₦${providerPayout.toLocaleString()} in your bank account after you complete the work.`,
          }
        });
      }

      // Notify client that payment is secured
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'PAYMENT',
          title: 'Payment Secured in Escrow',
          message: `Your payment of ₦${paymentAmount.toLocaleString()} for ${serviceType.toLowerCase()} has been secured in escrow. Payment will be automatically released to the artisan's bank account after the work is completed. Platform fee: ₦${platformFee.toLocaleString()} (${(PLATFORM_FEE_PERCENT * 100).toFixed(0)}%).`,
        }
      });
    }

    // Notify the chosen provider about the booking
    if (assignedProviderId && serviceRequest.provider) {
      await db.notification.create({
        data: {
          userId: serviceRequest.provider.user.id,
          type: 'MATCH',
          title: 'New Job Offer',
          message: `A client has booked you for a ${serviceType.toLowerCase()} service in ${location}${paymentAmount > 0 ? ` with ₦${paymentAmount.toLocaleString()} secured in escrow` : ''}. Please accept or decline.`,
        }
      });
    } else {
      // No specific provider - notify all matching providers
      const matchingProviders = await db.provider.findMany({
        where: {
          verificationStatus: 'VERIFIED',
          skills: { contains: serviceType },
        }
      });

      for (const provider of matchingProviders) {
        await db.notification.create({
          data: {
            userId: provider.userId,
            type: 'SERVICE_REQUEST',
            title: 'New Service Request',
            message: `A client needs ${serviceType.toLowerCase()} service in ${location}`,
          }
        });
      }
    }

    // Re-fetch with transaction included
    const result = await db.serviceRequest.findUnique({
      where: { id: serviceRequest.id },
      include: {
        client: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        provider: { include: { user: { select: { id: true, name: true, avatarUrl: true, phone: true } } } },
        transaction: true,
      }
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Services POST error:', error);
    return NextResponse.json({ error: 'Failed to create service request' }, { status: 500 });
  }
}
