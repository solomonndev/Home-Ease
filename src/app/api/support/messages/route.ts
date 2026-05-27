import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/support/messages - Get support chat messages or conversations
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      console.log('[SupportMessages GET] Unauthorized - no valid user from token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log(`[SupportMessages GET] user=${user.id} role=${user.role} userId=${userId || 'none'}`);

    if (user.role === 'ADMIN' && !userId) {
      // Admin without userId — return list of conversations
      const conversations = await db.supportMessage.findMany({
        where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
        select: { senderId: true, receiverId: true },
        distinct: ['senderId', 'receiverId'],
        orderBy: { createdAt: 'desc' },
      });

      const userIds = new Set<string>();
      conversations.forEach(c => {
        userIds.add(c.senderId);
        userIds.add(c.receiverId);
      });
      userIds.delete(user.id);

      const users = await db.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        include: { provider: { select: { verificationStatus: true } } },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true, provider: true },
      });

      const lastMessages: Record<string, any> = {};
      const unreadCounts: Record<string, number> = {};

      for (const uid of Array.from(userIds)) {
        const lastMsg = await db.supportMessage.findFirst({
          where: {
            OR: [
              { senderId: uid, receiverId: user.id },
              { senderId: user.id, receiverId: uid },
            ]
          },
          orderBy: { createdAt: 'desc' },
          include: { sender: { select: { name: true } } },
        });
        if (lastMsg) lastMessages[uid] = lastMsg;

        const count = await db.supportMessage.count({
          where: { senderId: uid, receiverId: user.id, read: false },
        });
        unreadCounts[uid] = count;
      }

      console.log(`[SupportMessages GET] Returning ${users.length} conversations`);
    return NextResponse.json({ conversations: users, lastMessages, unreadCounts });
    }

    // Get messages for a specific conversation
    let where: any = {};

    if (user.role === 'ADMIN' && userId) {
      where = {
        OR: [
          { senderId: userId, receiverId: user.id },
          { senderId: user.id, receiverId: userId },
        ]
      };
    } else if (user.role === 'PROVIDER' || user.role === 'CLIENT') {
      const admin = await db.user.findFirst({ where: { role: 'ADMIN' } });
      if (!admin) return NextResponse.json({ messages: [] });
      where = {
        OR: [
          { senderId: user.id, receiverId: admin.id },
          { senderId: admin.id, receiverId: user.id },
        ]
      };
    } else {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messages = await db.supportMessage.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark incoming messages as read
    await db.supportMessage.updateMany({
      where: { receiverId: user.id, read: false },
      data: { read: true },
    });

    console.log(`[SupportMessages GET] Returning ${messages.length} messages for ${user.role}`);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Support messages GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/support/messages - Send a support message
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    let targetReceiverId = receiverId;

    if (!targetReceiverId) {
      if (user.role === 'PROVIDER' || user.role === 'CLIENT') {
        const admin = await db.user.findFirst({ where: { role: 'ADMIN' } });
        if (!admin) return NextResponse.json({ error: 'No admin found' }, { status: 404 });
        targetReceiverId = admin.id;
      } else if (user.role === 'ADMIN') {
        return NextResponse.json({ error: 'Receiver ID is required' }, { status: 400 });
      }
    }

    if (!targetReceiverId) {
      return NextResponse.json({ error: 'Receiver is required' }, { status: 400 });
    }

    console.log(`[SupportMessages POST] user=${user.id} → receiver=${targetReceiverId} content="${content.substring(0, 50)}"`);

    const message = await db.supportMessage.create({
      data: {
        senderId: user.id,
        receiverId: targetReceiverId,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    // Notify the receiver
    await db.notification.create({
      data: {
        userId: targetReceiverId,
        type: 'MESSAGE',
        title: 'Support Message',
        message: `${user.name}: ${content.trim().substring(0, 100)}`,
      },
    });

    console.log(`[SupportMessages POST] Message created id=${message.id}`);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Support messages POST error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
