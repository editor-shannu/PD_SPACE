import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const address = searchParams.get('address');
    const type = searchParams.get('type') || 'hospital';

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
    }

    const prompt = `You are a helpful medical information assistant.

Write a 2-3 sentence factual summary (maximum 55 words) about this ${type} called "${name}" located at "${address || 'India'}".

Include: what type of facility it is, key medical specialties or services it likely offers, and anything notable about it based on its name or location.
If you have no specific knowledge of it, still write a useful summary based on what a ${type} of this name would typically offer in India.
Do NOT say "I don't have information" — always provide a helpful summary. Plain text only, no bullet points or markdown.`;

    // Try Gemini 2.0 Flash first (fast + no grounding needed)
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];

    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 150,
              },
            }),
            signal: AbortSignal.timeout(8000),
          }
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.warn(`Gemini model ${model} failed:`, err);
          continue;
        }

        const data = await res.json();
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        if (summary.length > 10) {
          return NextResponse.json({ success: true, summary, model });
        }
      } catch (err) {
        console.warn(`Gemini model ${model} threw:`, err);
      }
    }

    // If all Gemini calls fail, return a generic fallback so UI always shows something
    const genericSummary = `${name} is a ${type} providing medical services in the local area. Please contact them directly for information about specialties, timings, and available treatments.`;
    return NextResponse.json({ success: true, summary: genericSummary, fallback: true });
  } catch (error) {
    console.error('Facilities info error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
