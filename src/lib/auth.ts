import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'domestic-services-secret-key-2024';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.substring(7);
  }
  return null;
}

export async function getAuthUser(headers: Headers) {
  const token = getTokenFromHeaders(headers);
  if (!token) return null;
  
  const payload = verifyToken(token);
  if (!payload) return null;

  const { db } = await import('@/lib/db');
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { provider: true }
  });
  
  if (!user || user.status === 'SUSPENDED') return null;
  
  return user;
}

export const SERVICE_TYPES = [
  'CLEANING',
  'COOKING',
  'CAREGIVING',
  'PLUMBING',
  'LAUNDRY',
  'MAINTENANCE',
  'ELECTRICAL',
  'PAINTING',
  'GARDENING',
  'ENGINEERING',
  'CARPENTRY',
  'SECURITY',
  'DRIVING',
  'TUTORING',
  'HAIRSTYLING',
  'BARBING',
  'HVAC',
  'MOVING',
  'PEST_CONTROL',
  'OTHER'
] as const;

export const SERVICE_LABELS: Record<string, string> = {
  CLEANING: 'Cleaning',
  COOKING: 'Cooking',
  CAREGIVING: 'Caregiving',
  PLUMBING: 'Plumbing',
  LAUNDRY: 'Laundry',
  MAINTENANCE: 'Maintenance',
  ELECTRICAL: 'Electrical',
  PAINTING: 'Painting',
  GARDENING: 'Gardening',
  ENGINEERING: 'Engineering',
  CARPENTRY: 'Carpentry',
  SECURITY: 'Security',
  DRIVING: 'Driving',
  TUTORING: 'Tutoring',
  HAIRSTYLING: 'Hairstyling',
  BARBING: 'Barbing',
  HVAC: 'HVAC',
  MOVING: 'Moving',
  PEST_CONTROL: 'Pest Control',
  OTHER: 'Other'
};

export const SERVICE_ICONS: Record<string, string> = {
  CLEANING: '🧹',
  COOKING: '🍳',
  CAREGIVING: '👶',
  PLUMBING: '🔧',
  LAUNDRY: '👔',
  MAINTENANCE: '🔨',
  ELECTRICAL: '⚡',
  PAINTING: '🎨',
  GARDENING: '🌿',
  ENGINEERING: '⚙️',
  CARPENTRY: '🪚',
  SECURITY: '🛡️',
  DRIVING: '🚗',
  TUTORING: '📚',
  HAIRSTYLING: '💇',
  BARBING: '💈',
  HVAC: '❄️',
  MOVING: '📦',
  PEST_CONTROL: '🪳',
  OTHER: '📋'
};

// Keywords/synonyms for per-word matching in search
export const SERVICE_KEYWORDS: Record<string, string[]> = {
  CLEANING: ['clean', 'wash', 'sweep', 'mop', 'dust', 'sanitize', 'tidy', 'scrub', 'vacuum', 'housekeeping', 'maid', 'janitor', 'deep clean', 'home cleaning', 'office cleaning'],
  COOKING: ['cook', 'chef', 'meal', 'food', 'kitchen', 'cater', 'catering', 'recipe', 'dinner', 'lunch', 'breakfast', 'party food', 'meal prep', 'private chef'],
  CAREGIVING: ['care', 'caregiver', 'nanny', 'babysit', 'babysitter', 'elderly', 'senior', 'childcare', 'child care', 'nurse', 'companion', 'sitter', 'special needs', 'home care'],
  PLUMBING: ['plumb', 'plumber', 'pipe', 'leak', 'drain', 'toilet', 'faucet', 'tap', 'water', 'sewage', 'sink', 'bathroom', 'shower', 'fitting'],
  LAUNDRY: ['laundry', 'wash', 'dry clean', 'iron', 'press', 'fold', 'clothes', 'garment', 'dry cleaning', 'washing', 'fabric care'],
  MAINTENANCE: ['maintain', 'repair', 'fix', 'handyman', 'handy', 'renovation', 'restore', 'refurbish', 'general repair', 'home repair', 'fixture', 'door', 'window', 'furniture'],
  ELECTRICAL: ['electric', 'wiring', 'wire', 'light', 'power', 'switch', 'outlet', 'socket', 'circuit', 'generator', 'fan', 'ac', 'air condition', 'appliance', 'bulb', 'fuse'],
  PAINTING: ['paint', 'painter', 'decorate', 'wall', 'interior', 'exterior', 'coat', 'primer', 'finish', 'color', 'varnish', 'stain', 'spray paint'],
  GARDENING: ['garden', 'lawn', 'mow', 'landscape', 'plant', 'flower', 'grass', 'weed', 'trim', 'hedge', 'tree', 'prune', 'outdoor', 'yard', 'fertilizer'],
  ENGINEERING: ['engineer', 'engineering', 'structural', 'civil', 'mechanical', 'construction', 'building', 'site engineer', 'project engineer', 'consultant', 'design', 'blueprint', 'surveyor'],
  CARPENTRY: ['carpenter', 'carpentry', 'wood', 'woodwork', 'furniture', 'cabinet', 'shelf', 'table', 'door', 'window frame', 'joinery', 'wooden'],
  SECURITY: ['security', 'guard', 'security guard', 'watchman', 'bouncer', 'protection', 'safety', 'surveillance', 'cctv', 'alarm', 'patrol', 'bodyguard'],
  DRIVING: ['driver', 'driving', 'chauffeur', 'uber', 'taxi', 'delivery', 'transport', 'ride', 'logistics', 'courier', 'truck'],
  TUTORING: ['tutor', 'tutoring', 'teacher', 'lesson', 'learn', 'study', 'academic', 'math', 'english', 'science', 'music', 'training', 'instructor', 'coach'],
  HAIRSTYLING: ['hair', 'hairstyle', 'stylist', 'styling', 'braids', 'weave', 'wig', 'salon', 'cornrow', 'dreadlock', 'twist', 'relaxer', 'hair treatment'],
  BARBING: ['barber', 'barbing', 'haircut', 'trim', 'shave', 'grooming', 'beard', 'fade', 'clippers', 'hair cut', 'barbershop'],
  HVAC: ['hvac', 'air conditioning', 'ac', 'refrigeration', 'cooling', 'heating', 'ventilation', 'compressor', 'thermostat', 'duct'],
  MOVING: ['moving', 'mover', 'pack', 'packing', 'relocate', 'relocation', 'furniture moving', 'loading', 'haul', 'transport'],
  PEST_CONTROL: ['pest', 'pest control', 'fumigation', 'insect', 'rodent', 'rat', 'cockroach', 'termite', 'exterminator', 'bug', 'spray'],
  OTHER: ['other', 'custom', 'special', 'miscellaneous', 'general'],
};

// Search services by query with per-word matching
export function searchServices(query: string): Array<{ value: string; label: string; icon: string; matchScore: number }> {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return SERVICE_TYPES.map(type => ({
      value: type,
      label: SERVICE_LABELS[type] || type,
      icon: SERVICE_ICONS[type] || '📋',
      matchScore: 0,
    }));
  }

  // Split query into individual words for per-word matching
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

  const results = SERVICE_TYPES.map(type => {
    const label = (SERVICE_LABELS[type] || type).toLowerCase();
    const value = type.toLowerCase();
    const keywords = SERVICE_KEYWORDS[type] || [];
    let matchScore = 0;

    for (const word of queryWords) {
      // Exact label match (highest priority)
      if (label === word) {
        matchScore += 100;
      }
      // Label starts with word
      else if (label.startsWith(word)) {
        matchScore += 80;
      }
      // Label contains word
      else if (label.includes(word)) {
        matchScore += 60;
      }
      // Value starts with word
      else if (value.startsWith(word)) {
        matchScore += 70;
      }
      // Value contains word
      else if (value.includes(word)) {
        matchScore += 50;
      }
      // Keyword exact match
      else if (keywords.some(kw => kw === word)) {
        matchScore += 40;
      }
      // Keyword starts with word
      else if (keywords.some(kw => kw.startsWith(word))) {
        matchScore += 30;
      }
      // Keyword contains word
      else if (keywords.some(kw => kw.includes(word))) {
        matchScore += 20;
      }
    }

    return {
      value: type,
      label: SERVICE_LABELS[type] || type,
      icon: SERVICE_ICONS[type] || '📋',
      matchScore,
    };
  });

  // Filter to only show matches, sorted by score
  return results
    .filter(r => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}
