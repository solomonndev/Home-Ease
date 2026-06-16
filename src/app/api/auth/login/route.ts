import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Identifier and password are required' },
        { status: 400 }
      );
    }

    // Determine lookup method: email contains @, phone starts with + or digit-only, else username
    const trimmed = identifier.trim();
    let user;

    if (trimmed.includes('@')) {
      // Login by email
      user = await db.user.findUnique({
        where: { email: trimmed.toLowerCase() },
        include: { provider: true }
      });
    } else if (/^\+?\d[\d\s-]{6,}$/.test(trimmed)) {
      // Login by phone number
      const normalizedPhone = trimmed.replace(/[\s-]/g, '');
      user = await db.user.findFirst({
        where: { phone: { equals: normalizedPhone } },
        include: { provider: true }
      });
    } else {
      // Login by username
      user = await db.user.findUnique({
        where: { username: trimmed },
        include: { provider: true }
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials. No account found.' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials. Check your password.' },
        { status: 401 }
      );
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Account suspended. Contact support.' },
        { status: 403 }
      );
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        status: user.status,
        provider: user.provider,
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}