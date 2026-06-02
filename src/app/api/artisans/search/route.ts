import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchServices, SERVICE_TYPES } from '@/lib/auth';

// GET /api/artisans/search - Search and filter artisans
// Shows all registered providers (VERIFIED, PENDING, DECLINED) with status badge
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

    // Build where clause - show all registered providers (no verification filter)
    const andConditions: any[] = [];

    // Determine which service types to search for
    let targetServices: string[] = [];

    if (serviceFilter) {
      // Exact service type specified
      targetServices = [serviceFilter];
    } else if (query) {
      // Use keyword search to find matching predefined service types
      const searchResults = searchServices(query);
      targetServices = searchResults
        .filter(r => r.matchScore > 0)
        .map(r => r.value);
    }

    // Service type filter: provider skills must contain at least one target service (case-insensitive)
    if (targetServices.length > 0) {
      andConditions.push({
        OR: targetServices.map(service => ({
          skills: { contains: service, mode: 'insensitive' }
        }))
      });
    }

    // Free-text query: match directly against provider skills (case-insensitive)
    if (query) {
      andConditions.push({
        OR: [
          { skills: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } },
          { location: { contains: query, mode: 'insensitive' } },
        ]
      });
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

    // Combine conditions: use AND with OR for skill matching
    let where: any;
    if (andConditions.length === 0) {
      where = {};
    } else if (andConditions.length === 1) {
      where = andConditions[0];
    } else {
      // For service/skill matching, wrap the relevant conditions in an OR
      // so either predefined service type OR free-text query matches
      const nonSkillConditions = andConditions.filter((_, i) => {
        // Skip the service type filter (index 1) and the free-text query filter
        if (targetServices.length > 0 && i === 0) return false;
        if (query && i === (targetServices.length > 0 ? 1 : 0)) return false;
        return true;
      });

      const skillConditions = [];
      if (targetServices.length > 0) {
        skillConditions.push({
          OR: targetServices.map(service => ({
            skills: { contains: service, mode: 'insensitive' }
          }))
        });
      }
      if (query) {
        skillConditions.push({
          OR: [
            { skills: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } },
            { location: { contains: query, mode: 'insensitive' } },
          ]
        });
      }

      if (skillConditions.length > 0) {
        where = {
          AND: [
            ...nonSkillConditions,
            { OR: skillConditions },
          ]
        };
      } else {
        where = { AND: nonSkillConditions };
      }
    }

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

    // Format provider data
    let formatted = providers.map(p => {
      const skills = p.skills.split(',').map(s => s.trim()).filter(Boolean);
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
        const queryLower = query.toLowerCase();
        for (const skill of skills) {
          const skillLower = skill.toLowerCase();
          if (skillLower === queryLower) matchScore += 10;
          else if (skillLower.includes(queryLower) || queryLower.includes(skillLower)) matchScore += 5;
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
          if (b.rating !== a.rating) return b.rating - a.rating;
          if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
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
