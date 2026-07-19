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

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

/** Try one Overpass endpoint with a given radius (ms timeout). Returns facilities or null. */
async function tryOverpass(
  endpoint: string,
  lat: number,
  lng: number,
  radiusM: number,
  timeoutMs: number
): Promise<Facility[] | null> {
  const query = `[out:json][timeout:${Math.floor(timeoutMs / 1000)}];(
node["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist)$"](around:${radiusM},${lat},${lng});
way["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist)$"](around:${radiusM},${lat},${lng});
node["healthcare"~"^(hospital|clinic|laboratory|diagnostic_laboratory)$"](around:${radiusM},${lat},${lng});
);out center 60;`;

  try {
    const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'MediFlowLocator/2.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data.elements) || data.elements.length === 0) return null;

    const facilities: Facility[] = data.elements
      .map((el: any) => {
        const tags = el.tags || {};
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (elLat == null || elLng == null) return null;

        let type: Facility['type'] = 'hospital';
        if (tags.amenity === 'pharmacy') type = 'pharmacy';
        else if (tags.amenity === 'clinic' || tags.amenity === 'doctors' || tags.amenity === 'dentist') type = 'clinic';
        else if (tags.healthcare === 'laboratory' || tags.healthcare === 'diagnostic_laboratory') type = 'diagnostic';

        const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || tags.mobile;

        return {
          id: `osm-${el.id}`,
          name: tags.name || tags.operator || `${type[0].toUpperCase()}${type.slice(1)} Near Me`,
          lat: elLat,
          lng: elLng,
          address:
            [tags['addr:full'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']]
              .filter(Boolean)
              .join(', ') || 'Nearby Area',
          type,
          distance: haversine(lat, lng, elLat, elLng),
          phone: phone || undefined,
        } satisfies Facility;
      })
      .filter((f: Facility | null): f is Facility => f !== null);

    return facilities.length > 0 ? facilities : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');

    if (!latStr || !lngStr) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    let facilities: Facility[] = [];

    // ── 1. Google Places API (instant if key present) ──────────────────────────
    const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (googleKey?.startsWith('AIzaSy')) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&keyword=hospital|clinic|pharmacy|diagnostic|medical&key=${googleKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'OK' && Array.isArray(data.results)) {
            facilities = data.results.map((place: any, idx: number) => {
              const types: string[] = place.types || [];
              const nl = place.name.toLowerCase();
              let type: Facility['type'] = 'hospital';
              if (types.includes('pharmacy') || nl.includes('pharmacy')) type = 'pharmacy';
              else if (nl.includes('diagnostic') || nl.includes('lab') || nl.includes('pathology')) type = 'diagnostic';
              else if (types.includes('doctor') || types.includes('dentist') || nl.includes('clinic')) type = 'clinic';

              return {
                id: place.place_id || `google-${idx}`,
                name: place.name,
                lat: place.geometry?.location?.lat,
                lng: place.geometry?.location?.lng,
                address: place.vicinity || 'Address not available',
                type,
                rating: place.rating,
                distance: haversine(lat, lng, place.geometry?.location?.lat, place.geometry?.location?.lng),
              } satisfies Facility;
            });
          }
        }
      } catch {
        // fall through to OSM
      }
    }

    // ── 2. OpenStreetMap — race all mirrors in parallel, take first winner ─────
    if (facilities.length === 0) {
      const mirrors = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://z.overpass-api.de/api/interpreter',
      ];

      // First try 10 km radius with a fast 6s timeout — much quicker
      try {
        const raceResults = await Promise.any(
          mirrors.map((m) => tryOverpass(m, lat, lng, 10000, 6000).then((f) => {
            if (!f) throw new Error('no results');
            return f;
          }))
        );
        facilities = raceResults;
      } catch {
        // All 10km attempts failed — expand to 25 km and try again
        try {
          const raceResults = await Promise.any(
            mirrors.map((m) => tryOverpass(m, lat, lng, 25000, 8000).then((f) => {
              if (!f) throw new Error('no results');
              return f;
            }))
          );
          facilities = raceResults;
        } catch {
          facilities = []; // All attempts failed
        }
      }
    }

    facilities.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

    return NextResponse.json({ success: true, facilities });
  } catch (error) {
    console.error('Facilities locator error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
