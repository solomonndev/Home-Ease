import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchServices, SERVICE_TYPES } from '@/lib/auth';

// GET /api/artisans/search - Search and filter artisans
// Query params:
//   q       - search query (keyword matching against service types)
//   service - exact service type filter (CLEANING, PLUMBING, etc.)
//   location - location filter (partial match, case-insensitive)
//   minRate  - minimum hourly rate (number)
//   maxRate  - maximum hourly rate (number)
//   minRating - minimum rating (number, 0-5)
//   availability - availability filter (WEEKDAYS, WEEKENDS, ALL_WEEK, CUSTOM)
//   sort     - sort by: rating (default), price_low, price_high, jobs, reviews
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

    // Determine which service types to search for
    let targetServices: string[] = [];

    if (serviceFilter) {
      // Exact service type specified
      targetServices = [serviceFilter];
    } else if (query) {
      // Use keyword search to find matching service types
      const searchResults = searchServices(query);
      targetServices = searchResults
        .filter(r => r.matchScore > 0)
        .map(r => r.value);
    }

    // Build where clause
    // We use AND to combine all conditions, with OR for service type matching
    const andConditions: any[] = [
      { verificationStatus: 'VERIFIED' },
    ];

    // Service type filter: provider skills must contain at least one target service
    // Use flexible matching to support free-text skills
    if (targetServices.length > 0) {
      andConditions.push({
        OR: targetServices.map(service => ({
          skills: { contains: service }
        }))
      });
    }

    // Also support free-text query matching against provider skills directly
    if (query && targetServices.length === 0) {
      // If keyword search didn't match predefined types, try matching against free-text skills
      andConditions.push({
        skills: { contains: query }
      });
    }

    // Location filter (partial match - SQLite is case-insensitive by default for ASCII)
    if (locationFilter) {
      andConditions.push({
        location: { contains: locationFilter }
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

    const where = andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    // Fetch matching providers
    const providers = await db.provider.findMany({
      where,
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

    // Format provider data
    let formatted = providers.map(p => {
      const skills = p.skills.split(',').map(s => s.trim()).filter(Boolean);
      // Calculate match score - supports both predefined and free-text skills
      let matchScore = 0;
      if (targetServices.length > 0) {
        for (const ts of targetServices) {
          for (const skill of skills) {
            const skillLower = skill.toLowerCase();
            const tsLower = ts.toLowerCase();
            if (skillLower === tsLower) matchScore += 10;
            else if (skillLower.includes(tsLower) || tsLower.includes(skillLower)) matchScore += 5;
          }
        }
      } else if (query) {
        // Free-text query matching
        const queryLower = query.toLowerCase();
        for (const skill of skills) {
          const skillLower = skill.toLowerCase();
          if (skillLower === queryLower) matchScore += 10;
          else if (skillLower.includes(queryLower) || queryLower.includes(skillLower)) matchScore += 5;
        }
      }

      return {
        id: p.id,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        phone: p.user.phone,
        skills,
        hourlyRate: p.hourlyRate,
        location: p.location,
        availability: p.availability,
        rating: p.rating,
        totalReviews: p.totalReviews,
        completedJobs: p.completedJobs,
        bio: p.bio,
        matchScore,
        recentReviews: p.feedbackReceived.map(f => ({
          rating: f.rating,
          comment: f.comment,
          clientName: f.client.name,
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
          if (b.rating !== a.rating) return b.rating - a.rating;
          if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
          return b.completedJobs - a.completedJobs;
        });
        break;
    }

    // Get unique locations and rate ranges for filter metadata
    const allProviders = await db.provider.findMany({
      where: { verificationStatus: 'VERIFIED' },
      select: { location: true, hourlyRate: true, availability: true },
    });

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
        serviceTypes: SERVICE_TYPES.map(type => ({
          value: type,
          label: type.charAt(0) + type.slice(1).toLowerCase(),
        })),
      },
    });
  } catch (error) {
    console.error('Artisans search error:', error);
    return NextResponse.json({ error: 'Failed to search artisans' }, { status: 500 });
  }
}
