import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchServices, SERVICE_TYPES, SERVICE_KEYWORDS } from '@/lib/auth';

// GET /api/artisans/search - Search and filter artisans
// Shows all registered providers with status badge
export async function GET(request: NextRequest) {
  try {
    const user = await (await import('@/lib/auth')).getAuthUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const serviceFilter = searchParams.get('service') || '';
    const locationFilter = searchParams.get('location') || '';
    const minRate = searchParams.get('minRate') ? parseFloat(searchParams.get('minRate')!) : null;
    const maxRate = searchParams.get('maxRate') ? parseFloat(searchParams.get('maxRate')!) : null;
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : null;
    const availabilityFilter = searchParams.get('availability') || '';
    const sortBy = searchParams.get('sort') || 'rating';

    // Collect all search terms for skill matching (predefined + keywords + free-text)
    const skillSearchTerms = new Set<string>();

    if (serviceFilter) {
      // When a specific service type is selected (e.g. "ENGINEERING"),
      // add the service type itself PLUS all its keywords AND stem variations
      skillSearchTerms.add(serviceFilter);
      const keywords = SERVICE_KEYWORDS[serviceFilter] || [];
      for (const kw of keywords) {
        skillSearchTerms.add(kw);
      }
    } else if (query) {
      // Free-text search: add predefined matching types + their keywords + the raw query
      const searchResults = searchServices(query);
      for (const r of searchResults) {
        if (r.matchScore > 0) {
          skillSearchTerms.add(r.value);
          const keywords = SERVICE_KEYWORDS[r.value] || [];
          for (const kw of keywords) {
            skillSearchTerms.add(kw);
          }
        }
      }
      skillSearchTerms.add(query);
    }

    // Build Prisma where clause
    const andConditions: any[] = [];

    // Skill matching: provider skills must contain at least one search term (case-insensitive)
    if (skillSearchTerms.size > 0) {
      const orSkills = [...skillSearchTerms].map(term => ({
        skills: { contains: term, mode: 'insensitive' }
      }));
      andConditions.push({ OR: orSkills });
    }

    // Location filter
    if (locationFilter) {
      andConditions.push({
        location: { contains: locationFilter, mode: 'insensitive' }
      });
    }

    // Price range filters
    if (minRate !== null || maxRate !== null) {
      const rateCondition: any = {};
      if (minRate !== null) rateCondition.gte = minRate;
      if (maxRate !== null) rateCondition.lte = maxRate;
      andConditions.push({ hourlyRate: rateCondition });
    }

    // Rating filter
    if (minRating !== null) {
      andConditions.push({ rating: { gte: minRating } });
    }

    // Availability filter
    if (availabilityFilter) {
      andConditions.push({ availability: availabilityFilter });
    }

    // Combine all conditions with AND
    const where = andConditions.length > 0
      ? { AND: andConditions }
      : {};

    // Fetch matching providers
    const providers = await db.provider.findMany({
      where,
      include: {
        User: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        Feedback: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            User: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Format provider data with relevance scoring
    const allSearchTerms = [...skillSearchTerms].map(t => t.toLowerCase());
    let formatted = providers.map(p => {
      const skills = p.skills.split(',').map(s => s.trim()).filter(Boolean);
      let matchScore = 0;
      for (const skill of skills) {
        const skillLower = skill.toLowerCase();
        for (const term of allSearchTerms) {
          if (skillLower === term) matchScore += 10;
          else if (skillLower.startsWith(term) || term.startsWith(skillLower)) matchScore += 5;
          else if (skillLower.includes(term) || term.includes(skillLower)) matchScore += 3;
        }
      }

      return {
        id: p.id,
        name: p.User.name,
        avatarUrl: p.User.avatarUrl,
        phone: p.User.phone,
        skills,
        hourlyRate: p.hourlyRate,
        location: p.location,
        availability: p.availability,
        rating: p.rating,
        totalReviews: p.totalReviews,
        completedJobs: p.completedJobs,
        bio: p.bio,
        verificationStatus: p.verificationStatus,
        matchScore,
        recentReviews: p.Feedback.map(f => ({
          rating: f.rating,
          comment: f.comment,
          clientName: f.User.name,
          date: f.createdAt,
        })),
      };
    });

    // Sort results
    switch (sortBy) {
      case 'price_low':
        formatted.sort((a, b) => a.hourlyRate - b.hourlyRate);
        break;
      case 'price_high':
        formatted.sort((a, b) => b.hourlyRate - a.hourlyRate);
        break;
      case 'jobs':
        formatted.sort((a, b) => b.completedJobs - a.completedJobs);
        break;
      case 'reviews':
        formatted.sort((a, b) => b.totalReviews - a.totalReviews);
        break;
      case 'rating':
      default:
        formatted.sort((a, b) => {
          // Verified providers first
          if (a.verificationStatus === 'VERIFIED' && b.verificationStatus !== 'VERIFIED') return -1;
          if (b.verificationStatus === 'VERIFIED' && a.verificationStatus !== 'VERIFIED') return 1;
          if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.completedJobs - a.completedJobs;
        });
        break;
    }

    // Get filter metadata from all registered providers
    const allProviders = await db.provider.findMany({
      select: { location: true, hourlyRate: true, availability: true, skills: true, verificationStatus: true },
    });

    // Extract all unique skills across all providers
    const allSkills = new Set<string>();
    for (const p of allProviders) {
      for (const skill of (p.skills || '').split(',').map(s => s.trim()).filter(Boolean)) {
        allSkills.add(skill);
      }
    }

    const uniqueLocations = [...new Set(allProviders.map(p => p.location).filter(Boolean))].sort() as string[];
    const rates = allProviders.map(p => p.hourlyRate).filter(r => r > 0);
    const minAvailableRate = rates.length > 0 ? Math.min(...rates) : 0;
    const maxAvailableRate = rates.length > 0 ? Math.max(...rates) : 0;
    const uniqueAvailabilities = [...new Set(allProviders.map(p => p.availability).filter(Boolean))].sort() as string[];

    return NextResponse.json({
      artisans: formatted,
      total: formatted.length,
      filters: {
        locations: uniqueLocations,
        rateRange: { min: minAvailableRate, max: maxAvailableRate },
        availabilities: uniqueAvailabilities,
        serviceTypes: [
          ...SERVICE_TYPES.map(type => ({
            value: type,
            label: type.charAt(0) + type.slice(1).toLowerCase(),
          })),
          // Also include custom skills that aren't in predefined types
          ...[...allSkills]
            .filter(s => !SERVICE_TYPES.includes(s.toUpperCase()))
            .map(s => ({ value: s.toUpperCase(), label: s })),
        ],
      },
    });
  } catch (error) {
    console.error('[Artisans Search] Error:', error);
    return NextResponse.json({ error: 'Failed to search artisans' }, { status: 500 });
  }
}
