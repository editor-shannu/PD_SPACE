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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');

    if (!latStr || !lngStr) {
      return NextResponse.json({ success: false, error: 'Latitude and longitude are required' }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    let facilities: Facility[] = [];

    // Helper: calculate distance in km
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return parseFloat((R * c).toFixed(1));
    };

    // 1. Try Google Places API if a key is present
    const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (googleKey && googleKey.startsWith('AIzaSy')) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50000&type=hospital|pharmacy&key=${googleKey}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && Array.isArray(data.results)) {
            facilities = data.results.map((place: any, idx: number) => {
              const types = place.types || [];
              let type: Facility['type'] = 'hospital';
              if (types.includes('pharmacy')) type = 'pharmacy';
              else if (types.includes('doctor') || types.includes('health')) type = 'clinic';

              return {
                id: place.place_id || `google-${idx}`,
                name: place.name,
                lat: place.geometry?.location?.lat,
                lng: place.geometry?.location?.lng,
                address: place.vicinity || 'Address not available',
                type,
                rating: place.rating,
                distance: getDistance(lat, lng, place.geometry?.location?.lat, place.geometry?.location?.lng),
              };
            });
          }
        }
      } catch (err) {
        console.warn('Google Places API call failed, falling back:', err);
      }
    }

    // 2. Fallback to OpenStreetMap Overpass API if no results
    if (facilities.length === 0) {
      try {
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:15];(node["amenity"="hospital"](around:50000,${lat},${lng});way["amenity"="hospital"](around:50000,${lat},${lng});node["amenity"="clinic"](around:50000,${lat},${lng});way["amenity"="clinic"](around:50000,${lat},${lng});node["amenity"="pharmacy"](around:50000,${lat},${lng});way["amenity"="pharmacy"](around:50000,${lat},${lng}););out center;`;
        const response = await fetch(overpassUrl, {
          headers: {
            'User-Agent': 'MediFlowHealthcareLocator/1.0 (contact: support@mediflow.com)',
            'Accept': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.elements)) {
            facilities = data.elements
              .map((element: any) => {
                const tags = element.tags || {};
                let type: Facility['type'] = 'hospital';
                if (tags.amenity === 'pharmacy') type = 'pharmacy';
                else if (tags.amenity === 'clinic') type = 'clinic';

                const elLat = element.lat !== undefined ? element.lat : element.center?.lat;
                const elLng = element.lon !== undefined ? element.lon : element.center?.lon;

                if (elLat === undefined || elLng === undefined) return null;

                return {
                  id: `osm-${element.id}`,
                  name: tags.name || tags.operator || `${type.charAt(0).toUpperCase() + type.slice(1)} Near Me`,
                  lat: elLat,
                  lng: elLng,
                  address: tags['addr:full'] || tags['addr:street'] || tags['addr:suburb'] || tags['addr:city'] || 'Nearby Area',
                  type,
                  distance: getDistance(lat, lng, elLat, elLng),
                };
              })
              .filter((f: Facility | null): f is Facility => f !== null);
          }
        }
      } catch (err) {
        console.warn('OSM Overpass API call failed:', err);
      }
    }

    // Sort facilities by distance ascending
    facilities.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    return NextResponse.json({ success: true, facilities });
  } catch (error) {
    console.error('Facilities locator error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
