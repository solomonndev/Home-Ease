import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      include: { provider: true }
    });

    return NextResponse.json({
      id: fullUser!.id,
      name: fullUser!.name,
      email: fullUser!.email,
      phone: fullUser!.phone,
      role: fullUser!.role,
      avatarUrl: fullUser!.avatarUrl,
      status: fullUser!.status,
      provider: fullUser!.provider,
      createdAt: fullUser!.createdAt,
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, avatarUrl } = body;

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      include: { provider: true }
    });

    // Update provider profile if applicable
    if (user.role === 'PROVIDER' && user.provider) {
      const { skills, hourlyRate, location, bio, availability, bankName, accountNumber, accountName } = body;
      await db.provider.update({
        where: { userId: user.id },
        data: {
          ...(skills !== undefined && { skills }),
          ...(hourlyRate !== undefined && { hourlyRate }),
          ...(location !== undefined && { location }),
          ...(bio !== undefined && { bio }),
          ...(availability !== undefined && { availability }),
          // Bank account details for payout
          ...(bankName !== undefined && { bankName }),
          ...(accountNumber !== undefined && { accountNumber }),
          ...(accountName !== undefined && { accountName }),
        }
      });
    }

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      include: { provider: true }
    });

    return NextResponse.json({
      id: fullUser!.id,
      name: fullUser!.name,
      email: fullUser!.email,
      phone: fullUser!.phone,
      role: fullUser!.role,
      avatarUrl: fullUser!.avatarUrl,
      status: fullUser!.status,
      provider: fullUser!.provider,
      createdAt: fullUser!.createdAt,
    });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
