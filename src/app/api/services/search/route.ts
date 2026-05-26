import { NextRequest, NextResponse } from 'next/server';
import { searchServices, SERVICE_TYPES, SERVICE_LABELS, SERVICE_ICONS, SERVICE_KEYWORDS } from '@/lib/auth';

// GET /api/services/search - Search service types with per-word auto-suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query) {
      // Return all services when no query
      const allServices = SERVICE_TYPES.map(type => ({
        value: type,
        label: SERVICE_LABELS[type] || type,
        icon: SERVICE_ICONS[type] || '📋',
        keywords: (SERVICE_KEYWORDS[type] || []).slice(0, 5), // Top 5 keywords for hint
      }));
      return NextResponse.json({ services: allServices });
    }

    // Use the per-word matching search function
    const results = searchServices(query);

    const services = results.map(r => ({
      value: r.value,
      label: r.label,
      icon: r.icon,
      matchScore: r.matchScore,
      keywords: (SERVICE_KEYWORDS[r.value] || []).slice(0, 5),
    }));

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Service search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
