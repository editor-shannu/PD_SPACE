import { NextRequest, NextResponse } from 'next/server';

interface Facility {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'diagnostic';
  rating?: number;
  phone?: string;
  distance?: number;
}

// ── Server-side in-memory cache (5-min TTL, ~1 km grid key) ──────────────────
const cache = new Map<string, { data: Facility[]; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

// ── Haversine ─────────────────────────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

// ── Classify OSM element type ─────────────────────────────────────────────────
function classifyType(tags: Record<string, string>): Facility['type'] {
  const amenity = tags.amenity ?? '';
  const healthcare = tags.healthcare ?? '';
  const name = (tags.name ?? '').toLowerCase();

  if (amenity === 'pharmacy' || name.includes('pharmacy') || name.includes('medical store'))
    return 'pharmacy';
  if (
    healthcare === 'laboratory' ||
    healthcare === 'diagnostic' ||
    name.includes('diagnostic') ||
    name.includes('lab') ||
    name.includes('patholog') ||
    name.includes('imaging') ||
    name.includes('scan')
  )
    return 'diagnostic';
  if (
    amenity === 'clinic' ||
    amenity === 'doctors' ||
    amenity === 'dentist' ||
    healthcare === 'doctor' ||
    healthcare === 'clinic' ||
    healthcare === 'dentist' ||
    name.includes('clinic') ||
    name.includes('nursing home') ||
    name.includes('maternity') ||
    name.includes('polyclinic')
  )
    return 'clinic';

  return 'hospital';
}

// ── Build Overpass query — broad enough to catch rural Indian healthcare ───────
function buildQuery(lat: number, lng: number, radiusM: number): string {
  const t = Math.ceil(radiusM / 1000) + 5; // generous timeout seconds
  return `[out:json][timeout:${t}];(
node["amenity"~"hospital|clinic|pharmacy|doctors|dentist|health_post|health_centre|nursing_home|maternity"](around:${radiusM},${lat},${lng});
way["amenity"~"hospital|clinic|pharmacy|doctors|dentist|health_post|health_centre|nursing_home|maternity"](around:${radiusM},${lat},${lng});
node["healthcare"](around:${radiusM},${lat},${lng});
way["healthcare"](around:${radiusM},${lat},${lng});
node["amenity"="hospital"](around:${radiusM},${lat},${lng});
);out center 60;`;
}

// ── Try one Overpass mirror ───────────────────────────────────────────────────
async function tryOverpass(
  endpoint: string,
  lat: number,
  lng: number,
  radiusM: number,
  timeoutMs: number
): Promise<Facility[] | null> {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const query = buildQuery(lat, lng, radiusM);
    const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'MediFlowLocator/3.0 (mediflow@support.com)' },
      signal: controller.signal,
    });
    clearTimeout(timerId);

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.elements) || data.elements.length === 0) return null;

    // De-duplicate by id (node vs way may appear twice)
    const seen = new Set<string>();
    const facilities: Facility[] = [];

    for (const el of data.elements) {
      const id = `osm-${el.id}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const tags: Record<string, string> = el.tags ?? {};
      const elLat: number | undefined = el.lat ?? el.center?.lat;
      const elLng: number | undefined = el.lon ?? el.center?.lon;
      if (elLat == null || elLng == null) continue;

      // Skip unnamed nodes with no useful info
      const rawName: string = tags.name ?? tags.operator ?? '';
      if (!rawName) continue;

      const type = classifyType(tags);
      const phone: string | undefined =
        tags.phone ?? tags['contact:phone'] ?? tags['contact:mobile'] ?? tags.mobile;
      const addr = [tags['addr:full'], tags['addr:street'], tags['addr:suburb'], tags['addr:city'], tags['addr:state']]
        .filter(Boolean)
        .join(', ');

      facilities.push({
        id,
        name: rawName,
        lat: elLat,
        lng: elLng,
        address: addr || 'Nearby Area',
        type,
        distance: haversine(lat, lng, elLat, elLng),
        phone: phone || undefined,
      });
    }

    return facilities.length > 0 ? facilities : null;
  } catch {
    clearTimeout(timerId);
    return null;
  }
}

// ── Race all mirrors — resolve as soon as the first one succeeds ─────────────
function raceOverpass(lat: number, lng: number, radiusM: number, timeoutMs: number): Promise<Facility[] | null> {
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
  ];

  return new Promise((resolve) => {
    let done = false;
    let remaining = mirrors.length;

    for (const mirror of mirrors) {
      tryOverpass(mirror, lat, lng, radiusM, timeoutMs).then((result) => {
        remaining--;
        if (!done && result && result.length > 0) {
          done = true;
          resolve(result);
        } else if (!done && remaining === 0) {
          resolve(null);
        }
      });
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');

    if (!latStr || !lngStr) {
      return NextResponse.json({ success: false, error: 'lat and lng required' }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const key = cacheKey(lat, lng);

    // ── Serve from cache if fresh ─────────────────────────────────────────────
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      const withDist = cached.data
        .map((f) => ({ ...f, distance: haversine(lat, lng, f.lat, f.lng) }))
        .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
      return NextResponse.json({ success: true, facilities: withDist, cached: true });
    }

    let facilities: Facility[] = [];

    // ── 1. Google Places (instant when key available) ─────────────────────────
    const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (googleKey?.startsWith('AIzaSy')) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=30000&keyword=hospital|clinic|pharmacy|medical&key=${googleKey}`,
          { signal: controller.signal }
        );
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
            facilities = data.results
              .map((place: any, idx: number): Facility => {
                const types: string[] = place.types ?? [];
                const nl: string = (place.name ?? '').toLowerCase();
                let type: Facility['type'] = 'hospital';
                if (types.includes('pharmacy') || nl.includes('pharmacy')) type = 'pharmacy';
                else if (nl.includes('diagnostic') || nl.includes('lab') || nl.includes('pathology')) type = 'diagnostic';
                else if (types.includes('doctor') || types.includes('dentist') || nl.includes('clinic') || nl.includes('nursing'))
                  type = 'clinic';

                return {
                  id: place.place_id ?? `google-${idx}`,
                  name: place.name,
                  lat: place.geometry?.location?.lat,
                  lng: place.geometry?.location?.lng,
                  address: place.vicinity ?? 'Address not available',
                  type,
                  rating: place.rating,
                  distance: haversine(lat, lng, place.geometry?.location?.lat, place.geometry?.location?.lng),
                };
              })
              .filter((f: Facility) => f.lat != null && f.lng != null);
          }
        }
      } catch { /* fall through to OSM */ }
    }

    // ── 2. OpenStreetMap Overpass — cascade: 15km → 30km ─────────────────────
    // Start at 15km (realistic for close hospitals), then go up to 30km
    if (facilities.length === 0) {
      facilities = (await raceOverpass(lat, lng, 15000, 10000)) ?? [];
    }
    if (facilities.length === 0) {
      facilities = (await raceOverpass(lat, lng, 30000, 12000)) ?? [];
    }

    // ── 3. Nominatim fallback (entirely different API — works when Overpass rate-limits) ──
    if (facilities.length === 0) {
      try {
        const types = ['hospital', 'clinic', 'pharmacy', 'doctors'];
        const nominatimResults: Facility[] = [];
        // ~30km bounding box: 0.27 degrees from center
        const dDeg = 0.27;
        const left = lng - dDeg;
        const right = lng + dDeg;
        const top = lat + dDeg;
        const bottom = lat - dDeg;

        for (const amenity of types) {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 7000);
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?amenity=${amenity}&viewbox=${left},${top},${right},${bottom}&bounded=1&format=json&limit=15&addressdetails=1`,
              {
                headers: { 'User-Agent': 'MediFlowLocator/3.0 (mediflow@support.com)' },
                signal: controller.signal,
              }
            );
            clearTimeout(tid);
            if (res.ok) {
              const data: any[] = await res.json();
              for (const item of data) {
                const iLat = parseFloat(item.lat);
                const iLng = parseFloat(item.lon);
                const dist = haversine(lat, lng, iLat, iLng);
                if (dist > 30) continue;
                const name = item.namedetails?.name || item.display_name?.split(',')[0] || '';
                if (!name) continue;
                nominatimResults.push({
                  id: `nom-${item.osm_id}`,
                  name,
                  lat: iLat,
                  lng: iLng,
                  address: [item.address?.road, item.address?.suburb, item.address?.city, item.address?.state]
                    .filter(Boolean).join(', ') || item.display_name?.split(',').slice(1, 3).join(',').trim() || 'Nearby',
                  type: amenity === 'hospital' ? 'hospital' : amenity === 'pharmacy' ? 'pharmacy' : 'clinic',
                  distance: dist,
                });
              }
            }
          } catch { clearTimeout(tid); }
        }
        facilities = nominatimResults;
      } catch { /* all attempts exhausted */ }
    }

    // Filter to 30km and sort
    facilities = facilities
      .filter((f) => (f.distance ?? 999) <= 30)
      .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

    // ── Cache and return ──────────────────────────────────────────────────────
    if (facilities.length > 0) {
      cache.set(key, { data: facilities, expires: Date.now() + CACHE_TTL });
      // Evict stale entries
      if (cache.size > 300) {
        const now = Date.now();
        for (const [k, v] of cache) if (v.expires < now) cache.delete(k);
      }
    }

    return NextResponse.json({ success: true, facilities });
  } catch (error) {
    console.error('Facilities locator error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
