import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/providers - Fetch available providers by service type
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get('serviceType');

    if (!serviceType) {
      return NextResponse.json({ error: 'Service type is required' }, { status: 400 });
    }

    // Find all registered providers (not just verified) whose skills include the requested service type
    const providers = await db.provider.findMany({
      where: {
        skills: { contains: serviceType, mode: 'insensitive' },
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        feedbackReceived: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Format provider data for client view
    const formatted = providers.map(p => ({
      id: p.id,
      name: p.user.name,
      avatarUrl: p.user.avatarUrl,
      phone: p.user.phone,
      skills: p.skills.split(',').map(s => s.trim()).filter(Boolean),
      hourlyRate: p.hourlyRate,
      location: p.location,
      availability: p.availability,
      rating: p.rating,
      totalReviews: p.totalReviews,
      completedJobs: p.completedJobs,
      bio: p.bio,
      verificationStatus: p.verificationStatus,
      recentReviews: p.feedbackReceived.map(f => ({
        rating: f.rating,
        comment: f.comment,
        clientName: f.client.name,
        date: f.createdAt,
      })),
    }));

    // Sort: verified first, then by rating, then by completed jobs
    formatted.sort((a, b) => {
      if (a.verificationStatus === 'VERIFIED' && b.verificationStatus !== 'VERIFIED') return -1;
      if (b.verificationStatus === 'VERIFIED' && a.verificationStatus !== 'VERIFIED') return 1;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.completedJobs - a.completedJobs;
    });

    return NextResponse.json({ providers: formatted });
  } catch (error) {
    console.error('Providers GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}
