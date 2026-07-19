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

// ── Server-side in-memory cache (persists across requests in same process) ────
const cache = new Map<string, { data: Facility[]; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(lat: number, lng: number) {
  // Round to ~1 km grid so nearby requests share cache
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

// ── Haversine distance ────────────────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

// ── Fetch from one Overpass mirror with manual timeout ────────────────────────
async function tryOverpass(
  endpoint: string,
  lat: number,
  lng: number,
  radiusM: number,
  timeoutMs: number
): Promise<Facility[] | null> {
  const query = `[out:json][timeout:${Math.ceil(timeoutMs / 1000)}];(
node["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist)$"](around:${radiusM},${lat},${lng});
way["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist)$"](around:${radiusM},${lat},${lng});
node["healthcare"~"^(hospital|clinic|laboratory|diagnostic_laboratory)$"](around:${radiusM},${lat},${lng});
);out center 40;`;

  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'MediFlowLocator/2.1', Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timerId);

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.elements) || data.elements.length === 0) return null;

    const facilities: Facility[] = data.elements
      .map((el: any): Facility | null => {
        const tags = el.tags ?? {};
        const elLat: number | undefined = el.lat ?? el.center?.lat;
        const elLng: number | undefined = el.lon ?? el.center?.lon;
        if (elLat == null || elLng == null) return null;

        let type: Facility['type'] = 'hospital';
        if (tags.amenity === 'pharmacy') type = 'pharmacy';
        else if (['clinic', 'doctors', 'dentist'].includes(tags.amenity)) type = 'clinic';
        else if (['laboratory', 'diagnostic_laboratory'].includes(tags.healthcare)) type = 'diagnostic';

        const phone: string | undefined =
          tags.phone ?? tags['contact:phone'] ?? tags['contact:mobile'] ?? tags.mobile;

        const addr = [tags['addr:full'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']]
          .filter(Boolean)
          .join(', ');

        return {
          id: `osm-${el.id}`,
          name: tags.name ?? tags.operator ?? `${type[0].toUpperCase()}${type.slice(1)} Near Me`,
          lat: elLat,
          lng: elLng,
          address: addr || 'Nearby Area',
          type,
          distance: haversine(lat, lng, elLat, elLng),
          phone: phone || undefined,
        };
      })
      .filter((f: Facility | null): f is Facility => f !== null);

    return facilities.length > 0 ? facilities : null;
  } catch {
    clearTimeout(timerId);
    return null;
  }
}

// ── Race all mirrors in parallel, take first non-null result ──────────────────
async function raceOverpass(
  lat: number,
  lng: number,
  radiusM: number,
  timeoutMs: number
): Promise<Facility[] | null> {
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
  ];

  return new Promise((resolve) => {
    let resolved = false;
    let pending = mirrors.length;

    mirrors.forEach((mirror) => {
      tryOverpass(mirror, lat, lng, radiusM, timeoutMs).then((result) => {
        pending--;
        if (!resolved && result && result.length > 0) {
          resolved = true;
          resolve(result);
        } else if (!resolved && pending === 0) {
          resolve(null); // All mirrors returned nothing
        }
      });
    });
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
      // Recalculate distances for exact coords (cache may have slightly different origin)
      const withDist = cached.data.map((f) => ({ ...f, distance: haversine(lat, lng, f.lat, f.lng) }));
      withDist.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
      return NextResponse.json({ success: true, facilities: withDist, cached: true });
    }

    let facilities: Facility[] = [];

    // ── 1. Google Places (fastest if key present) ────────────────────────────
    const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (googleKey?.startsWith('AIzaSy')) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&keyword=hospital|clinic|pharmacy|medical&key=${googleKey}`,
          { signal: controller.signal }
        );
        clearTimeout(tid);

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
            facilities = data.results.map((place: any, idx: number) => {
              const types: string[] = place.types ?? [];
              const nl: string = (place.name ?? '').toLowerCase();
              let type: Facility['type'] = 'hospital';
              if (types.includes('pharmacy') || nl.includes('pharmacy')) type = 'pharmacy';
              else if (nl.includes('diagnostic') || nl.includes('lab') || nl.includes('pathology')) type = 'diagnostic';
              else if (types.includes('doctor') || types.includes('dentist') || nl.includes('clinic')) type = 'clinic';

              return {
                id: place.place_id ?? `google-${idx}`,
                name: place.name,
                lat: place.geometry?.location?.lat,
                lng: place.geometry?.location?.lng,
                address: place.vicinity ?? 'Address not available',
                type,
                rating: place.rating,
                distance: haversine(lat, lng, place.geometry?.location?.lat, place.geometry?.location?.lng),
              } as Facility;
            });
          }
        }
      } catch { /* fall through */ }
    }

    // ── 2. OpenStreetMap — cascade 5 km → 15 km → 40 km ────────────────────
    if (facilities.length === 0) {
      // Fast 5km first — usually returns in <2s
      facilities = (await raceOverpass(lat, lng, 5000, 5000)) ?? [];
    }
    if (facilities.length === 0) {
      facilities = (await raceOverpass(lat, lng, 15000, 7000)) ?? [];
    }
    if (facilities.length === 0) {
      facilities = (await raceOverpass(lat, lng, 40000, 9000)) ?? [];
    }

    // Filter to 50km just in case, sort by distance
    facilities = facilities
      .filter((f) => (f.distance ?? 999) <= 50)
      .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

    // ── Cache the result ──────────────────────────────────────────────────────
    if (facilities.length > 0) {
      cache.set(key, { data: facilities, expires: Date.now() + CACHE_TTL_MS });
      // Prune old entries if cache grows large
      if (cache.size > 200) {
        const now = Date.now();
        for (const [k, v] of cache) {
          if (v.expires < now) cache.delete(k);
        }
      }
    }

    return NextResponse.json({ success: true, facilities });
  } catch (error) {
    console.error('Facilities locator error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
