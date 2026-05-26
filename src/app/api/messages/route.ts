import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/messages - Get messages for a service request
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

    // Access control: verify user is part of this conversation
    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
      include: { provider: true },
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    // Only allow chat for accepted/in-progress/completed jobs (not PENDING/MATCHED)
    if (!['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(serviceRequest.status)) {
      return NextResponse.json({ error: 'Chat is only available after job acceptance' }, { status: 403 });
    }

    // Verify user is the client or the provider of this request
    const isClient = serviceRequest.clientId === user.id;
    const isProvider = serviceRequest.provider?.userId === user.id;
    if (!isClient && !isProvider) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messages = await db.message.findMany({
      where: { requestId },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/messages - Send a message
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, content } = body;

    if (!requestId || !content) {
      return NextResponse.json({ error: 'Request ID and content are required' }, { status: 400 });
    }

    // Access control: verify user is part of this conversation and chat is enabled
    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
      include: { provider: true },
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    // Only allow chat for accepted/in-progress/completed jobs
    if (!['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(serviceRequest.status)) {
      return NextResponse.json({ error: 'Chat is only available after job acceptance' }, { status: 403 });
    }

    const isClient = serviceRequest.clientId === user.id;
    const isProvider = serviceRequest.provider?.userId === user.id;
    if (!isClient && !isProvider) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const message = await db.message.create({
      data: {
        requestId,
        senderId: user.id,
        content,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
      }
    });

    // Notify the other party
    const recipientId = user.id === serviceRequest.clientId
      ? serviceRequest.provider?.userId
      : serviceRequest.clientId;

    if (recipientId) {
      await db.notification.create({
        data: {
          userId: recipientId,
          type: 'MESSAGE',
          title: 'New Message',
          message: `${user.name} sent you a message about your ${serviceRequest.serviceType.toLowerCase()} request`,
        }
      });
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
