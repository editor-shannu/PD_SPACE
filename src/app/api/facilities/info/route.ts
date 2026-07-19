import { NextRequest, NextResponse } from 'next/server';

// ── Helper: create a fetch with a manual timeout ─────────────────────────────
async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ── Gemini call with manual timeout ─────────────────────────────────────────
async function callGemini(apiKey: string, model: string, prompt: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 160 },
        }),
      },
      9000
    );

    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return text.trim().length > 15 ? text.trim() : null;
  } catch {
    return null;
  }
}

// ── Google Places: look up phone + rating by text search ─────────────────────
async function fetchPlaceDetails(
  name: string,
  address: string,
  apiKey: string
): Promise<{ phone?: string; rating?: number } | null> {
  try {
    const query = encodeURIComponent(`${name} ${address}`);
    const searchRes = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`,
      {},
      5000
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const placeId: string | undefined = searchData.results?.[0]?.place_id;
    if (!placeId) return null;

    const detailRes = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,rating&key=${apiKey}`,
      {},
      5000
    );
    if (!detailRes.ok) return null;
    const detailData = await detailRes.json();
    return {
      phone: detailData.result?.formatted_phone_number,
      rating: detailData.result?.rating,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name    = searchParams.get('name') ?? '';
  const address = searchParams.get('address') ?? '';
  const type    = searchParams.get('type') ?? 'hospital';

  if (!name) {
    return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  // ── Run AI summary + Google Places phone lookup in parallel ────────────────
  const [summaryResult, placeResult] = await Promise.allSettled([
    // AI Summary
    (async (): Promise<string> => {
      if (!geminiKey) throw new Error('No Gemini key');

      // Unique-per-hospital prompt — starts with hospital name, mentions location
      const prompt = `Write a 2-sentence description (max 50 words) for a medical facility search result.

Facility name: "${name}"
Location: ${address || 'India'}
Category: ${type}

Rules:
- Start with the exact facility name "${name}"
- Mention the specific location "${address || 'India'}" naturally
- Describe what kind of medical care it typically provides (based on name and type)
- Be specific to THIS facility's name — do not write a generic template
- Plain text only, no bullet points, no asterisks`;

      for (const model of ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash']) {
        const text = await callGemini(geminiKey, model, prompt);
        if (text) return text;
      }
      throw new Error('All Gemini models failed');
    })(),

    // Phone + rating from Google Places
    (async () => {
      if (!googleKey?.startsWith('AIzaSy')) return null;
      return fetchPlaceDetails(name, address, googleKey);
    })(),
  ]);

  const summary =
    summaryResult.status === 'fulfilled'
      ? summaryResult.value
      : `${name} is a ${type} located in ${address || 'the local area'}. It provides essential medical services to the community. Contact the facility directly for appointment and specialist information.`;

  const placeData = placeResult.status === 'fulfilled' ? placeResult.value : null;

  return NextResponse.json({
    success: true,
    summary,
    phone: placeData?.phone ?? null,
    rating: placeData?.rating ?? null,
    fromGemini: summaryResult.status === 'fulfilled',
  });
}
