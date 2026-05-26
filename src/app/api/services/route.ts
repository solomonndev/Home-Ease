import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, SERVICE_TYPES } from '@/lib/auth';

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

// POST /api/services - Create a service request (booking)
// No upfront payment — client pays AFTER artisan completes the work
// Flow: Book → Artisan accepts → Check-in (timer) → Check-out → Client pays → Done
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
    const { serviceType, description, location, requestedDate, requestedTime, providerId } = body;

    if (!serviceType || !location || !requestedDate || !requestedTime) {
      return NextResponse.json(
        { error: 'Service type, location, date, and time are required' },
        { status: 400 }
      );
    }

    // If a specific provider is chosen, validate and assign directly
    let assignedProviderId = providerId || null;
    let initialStatus = 'PENDING';

    if (assignedProviderId) {
      const provider = await db.provider.findUnique({
        where: { id: assignedProviderId },
        include: { user: { select: { id: true, name: true } } },
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

    const serviceRequest = await db.serviceRequest.create({
      data: {
        clientId: user.id,
        providerId: assignedProviderId,
        serviceType,
        description: description || null,
        location,
        requestedDate: new Date(requestedDate),
        requestedTime,
        status: initialStatus,
        paymentStatus: 'PENDING',
      },
      include: {
        client: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        provider: { include: { user: { select: { id: true, name: true, avatarUrl: true, phone: true } } } },
      }
    });

    // Notify the chosen provider about the booking (NO payment at this stage)
    if (assignedProviderId && serviceRequest.provider) {
      await db.notification.create({
        data: {
          userId: serviceRequest.provider.user.id,
          type: 'MATCH',
          title: 'New Job Booking',
          message: `${user.name} has booked you for a ${serviceType.toLowerCase()} service in ${location} on ${new Date(requestedDate).toLocaleDateString()} at ${requestedTime}. Please accept or decline. You will be paid based on hours worked (${serviceRequest.provider?.hourlyRate ? `₦${serviceRequest.provider.hourlyRate.toLocaleString()}/hr` : 'your hourly rate'}).`,
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
