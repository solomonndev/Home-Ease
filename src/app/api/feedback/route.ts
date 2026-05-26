import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/feedback - Get feedback for a provider
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const feedbacks = await db.feedback.findMany({
      where: { providerId },
      include: {
        client: { select: { id: true, name: true, avatarUrl: true } },
        serviceRequest: { select: { serviceType: true, requestedDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error('Feedback GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

// POST /api/feedback - Submit feedback
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Only clients can submit feedback' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, rating, comment } = body;

    if (!requestId || !rating) {
      return NextResponse.json({ error: 'Request ID and rating are required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    if (serviceRequest.clientId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (serviceRequest.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Can only review completed services' }, { status: 400 });
    }

    if (!serviceRequest.providerId) {
      return NextResponse.json({ error: 'No provider assigned' }, { status: 400 });
    }

    // Check if feedback already exists
    const existing = await db.feedback.findUnique({ where: { requestId } });
    if (existing) {
      return NextResponse.json({ error: 'Feedback already submitted' }, { status: 409 });
    }

    const feedback = await db.feedback.create({
      data: {
        requestId,
        clientId: user.id,
        providerId: serviceRequest.providerId,
        rating,
        comment: comment || null,
      }
    });

    // Update provider rating
    const allFeedbacks = await db.feedback.findMany({
      where: { providerId: serviceRequest.providerId }
    });

    const avgRating = allFeedbacks.reduce((sum, f) => sum + f.rating, 0) / allFeedbacks.length;
    
    await db.provider.update({
      where: { id: serviceRequest.providerId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        totalReviews: allFeedbacks.length,
      }
    });

    // Notify provider
    const provider = await db.provider.findUnique({ where: { id: serviceRequest.providerId } });
    if (provider) {
      await db.notification.create({
        data: {
          userId: provider.userId,
          type: 'SYSTEM_ALERT',
          title: 'New Review',
          message: `You received a ${rating}-star review from a client`,
        }
      });
    }

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error('Feedback POST error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
