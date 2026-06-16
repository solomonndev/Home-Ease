import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, email, phone, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    // Username validation
    if (!username || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'Username is required (minimum 3 characters)' },
        { status: 400 }
      );
    }
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters (letters, numbers, . _ -)' },
        { status: 400 }
      );
    }

    if (!['CLIENT', 'PROVIDER'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be CLIENT or PROVIDER' },
        { status: 400 }
      );
    }

    // Check for existing email
    const existingEmail = await db.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Check for existing username
    const existingUsername = await db.user.findUnique({ where: { username: cleanUsername } });
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Check for existing phone
    if (phone) {
      const normalizedPhone = phone.replace(/[\s-]/g, '');
      const existingPhone = await db.user.findFirst({ where: { phone: normalizedPhone } });
      if (existingPhone) {
        return NextResponse.json(
          { error: 'Phone number already registered' },
          { status: 409 }
        );
      }
    }

    const passwordHash = await hashPassword(password);
    
    const user = await db.user.create({
      data: {
        name,
        username: cleanUsername,
        email,
        phone: phone ? phone.replace(/[\s-]/g, '') : null,
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

      // Notify all admin users about the new provider registration
      const admins = await db.user.findMany({ where: { role: 'ADMIN' } });
      if (admins.length > 0) {
        await db.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            type: 'SYSTEM_ALERT',
            title: 'New Provider Registration',
            message: `A new provider "${name}" (${email}) has registered with skills: ${skills || 'none specified'}. Please review and verify their account.`,
          }))
        });
      }
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
        username: fullUser!.username,
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