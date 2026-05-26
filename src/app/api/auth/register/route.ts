import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    if (!['CLIENT', 'PROVIDER'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be CLIENT or PROVIDER' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    
    const user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role,
      }
    });

    if (role === 'PROVIDER') {
      const { skills, hourlyRate, location, bio, bankName, accountNumber, accountName } = body;
      await db.provider.create({
        data: {
          userId: user.id,
          skills: skills || '',
          hourlyRate: hourlyRate || 0,
          location: location || '',
          bio: bio || null,
          bankName: bankName || null,
          accountNumber: accountNumber || null,
          accountName: accountName || null,
        }
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      include: { provider: true }
    });

    return NextResponse.json({
      token,
      user: {
        id: fullUser!.id,
        name: fullUser!.name,
        email: fullUser!.email,
        phone: fullUser!.phone,
        role: fullUser!.role,
        avatarUrl: fullUser!.avatarUrl,
        status: fullUser!.status,
        provider: fullUser!.provider,
        createdAt: fullUser!.createdAt,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
