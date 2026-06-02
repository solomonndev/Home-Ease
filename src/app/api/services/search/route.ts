import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchServices, SERVICE_TYPES, SERVICE_LABELS, SERVICE_ICONS, SERVICE_KEYWORDS } from '@/lib/auth';

// GET /api/services/search - Search service types with per-word auto-suggestions
// Also dynamically includes actual skills from registered providers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    // Fetch all unique skills from registered providers
    const allProviders = await db.provider.findMany({
      where: { verificationStatus: { in: ['VERIFIED', 'PENDING'] } },
      select: { skills: true },
    });

    const providerSkills = new Set<string>();
    for (const p of allProviders) {
      for (const skill of (p.skills || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean)) {
        providerSkills.add(skill);
      }
    }

    // Build dynamic services list: predefined + custom provider skills
    const customServices: Array<{ value: string; label: string; icon: string }> = [];
    for (const skill of providerSkills) {
      if (!SERVICE_TYPES.includes(skill as any)) {
        customServices.push({
          value: skill,
          label: skill.charAt(0) + skill.slice(1).toLowerCase(),
          icon: '🔧',
        });
      }
    }

    if (!query) {
      // Return all services when no query
      const allServices = [
        ...SERVICE_TYPES.map(type => ({
          value: type,
          label: SERVICE_LABELS[type] || type,
          icon: SERVICE_ICONS[type] || '📋',
          keywords: (SERVICE_KEYWORDS[type] || []).slice(0, 5),
        })),
        ...customServices.map(cs => ({
          ...cs,
          keywords: [] as string[],
        })),
      ];
      return NextResponse.json({ services: allServices });
    }

    // Use the per-word matching search function for predefined types
    const predefinedResults = searchServices(query);

    // Also match custom provider skills against the query
    const queryLower = query.toLowerCase();
    const customResults = customServices
      .map(cs => {
        const valueLower = cs.value.toLowerCase();
        const labelLower = cs.label.toLowerCase();
        let matchScore = 0;
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
        for (const word of queryWords) {
          if (labelLower === word) matchScore += 100;
          else if (labelLower.startsWith(word)) matchScore += 80;
          else if (labelLower.includes(word)) matchScore += 60;
          else if (valueLower === word) matchScore += 70;
          else if (valueLower.includes(word)) matchScore += 50;
        }
        return { ...cs, matchScore, keywords: [] as string[] };
      })
      .filter(r => r.matchScore > 0);

    const services = [
      ...predefinedResults.map(r => ({
        value: r.value,
        label: r.label,
        icon: r.icon,
        matchScore: r.matchScore,
        keywords: (SERVICE_KEYWORDS[r.value] || []).slice(0, 5),
      })),
      ...customResults,
    ].sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Service search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
