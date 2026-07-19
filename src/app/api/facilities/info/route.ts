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

    const prompt = `You are a helpful medical assistant. Provide a concise summary (2-3 sentences, maximum 60 words) of this real-world medical facility:
Name: ${name}
Address: ${address || 'Nearby'}
Type: ${type}

Please search Google to find accurate information about this facility. Mention what it is known for, main specialties or services, and a brief note on its general reputation. Keep the response objective, clear, and direct. Do not include markdown styling or links.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          tools: [
            {
              googleSearch: {} // Search grounding for real-time information from Google
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('Gemini grounded call failed in facilities info, trying fallback:', errorData);
      
      // Fallback: Run standard Gemini call without googleSearch tool
      const fallbackRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 200,
            },
          }),
        }
      );

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const summary = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return NextResponse.json({ success: true, summary: summary.trim() });
      }

      return NextResponse.json({ success: false, error: 'Failed to retrieve info' }, { status: 502 });
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ success: true, summary: summary.trim() });
  } catch (error) {
    console.error('Facilities info error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
