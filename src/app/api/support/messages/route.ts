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
      const allMessages = await db.supportMessage.findMany({
        where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
        select: { senderId: true, receiverId: true },
      });

      console.log(`[SupportMessages GET] Found ${allMessages.length} total messages for admin`);

      const partnerIds = new Set<string>();
      for (const msg of allMessages) {
        if (msg.senderId !== user.id) partnerIds.add(msg.senderId);
        if (msg.receiverId !== user.id) partnerIds.add(msg.receiverId);
      }

      if (partnerIds.size === 0) {
        console.log('[SupportMessages GET] No conversation partners found');
        return NextResponse.json({ conversations: [], lastMessages: {}, unreadCounts: {} });
      }

      const partnerIdList = Array.from(partnerIds);

      // Fetch partner users with their provider verification status
      const users = await db.user.findMany({
        where: { id: { in: partnerIdList } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          provider: { select: { verificationStatus: true } },
        },
      });

      console.log(`[SupportMessages GET] Found ${users.length} conversation partners`);

      // Build last message and unread count for each partner (optimized single queries)
      const lastMessages: Record<string, any> = {};
      const unreadCounts: Record<string, number> = {};

      // Get all messages ordered by createdAt desc, grouped by conversation partner
      const allDetailed = await db.supportMessage.findMany({
        where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { name: true } } },
      });

      // Get all unread counts in one query
      const unreadAgg = await db.supportMessage.groupBy({
        by: ['senderId'],
        where: { receiverId: user.id, read: false },
        _count: { id: true },
      });
      const unreadMap: Record<string, number> = {};
      for (const row of unreadAgg) {
        unreadMap[row.senderId] = row._count.id;
      }

      // Build per-partner last message
      const seen = new Set<string>();
      for (const msg of allDetailed) {
        const partnerId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
        if (!seen.has(partnerId)) {
          seen.add(partnerId);
          lastMessages[partnerId] = msg;
        }
      }

      for (const uid of partnerIdList) {
        unreadCounts[uid] = unreadMap[uid] || 0;
      }

      console.log(`[SupportMessages GET] Returning ${users.length} conversations for admin`);
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
    console.error('[SupportMessages GET] Error:', error);
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
    const { receiverId, content, attachmentUrl, attachmentName, attachmentType } = body;

    if ((!content || !content.trim()) && !attachmentUrl) {
      return NextResponse.json({ error: 'Message content or attachment is required' }, { status: 400 });
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

    console.log(`[SupportMessages POST] user=${user.id} → receiver=${targetReceiverId} content="${(content || '').substring(0, 50)}" attachment=${attachmentName || 'none'}`);

    const message = await db.supportMessage.create({
      data: {
        senderId: user.id,
        receiverId: targetReceiverId,
        content: content?.trim() || '',
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        attachmentType: attachmentType || null,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    // Notify the receiver
    const notifContent = content?.trim() || `📎 ${attachmentName || 'File'}`;
    await db.notification.create({
      data: {
        userId: targetReceiverId,
        type: 'MESSAGE',
        title: 'Support Message',
        message: `${user.name}: ${notifContent.substring(0, 100)}`,
      },
    });

    console.log(`[SupportMessages POST] Message created id=${message.id}`);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('[SupportMessages POST] Error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
