import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/document';

interface ExplainRequest {
  documentId: string;
  language: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, language } = (await req.json()) as ExplainRequest;
    if (!documentId || !language) {
      return NextResponse.json({ success: false, error: 'Missing documentId or language' }, { status: 400 });
    }

    await connectDB();
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Verify user owns the document
    if (doc.userId !== (session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize explanations Map if not present
    if (!doc.explanations) {
      doc.explanations = new Map();
    }

    const langKey = language.toLowerCase().trim();
    
    // Check cache
    if (doc.explanations instanceof Map && doc.explanations.has(langKey)) {
      return NextResponse.json({ success: true, explanation: doc.explanations.get(langKey), cached: true });
    } else if (doc.explanations && typeof doc.explanations === 'object' && (doc.explanations as any)[langKey]) {
      return NextResponse.json({ success: true, explanation: (doc.explanations as any)[langKey], cached: true });
    }

    // Get Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
    }

    // Prepare content for explanation
    const structuredDataStr = JSON.stringify(doc.extractedData, null, 2);

    const prompt = `You are a patient-friendly medical communicator. 
Explain this prescription/report in ${language} using simple, everyday words, avoid medical jargon, and keep it under 100 words.

Here is the extracted medical data:
${structuredDataStr}

Please explain it clearly in ${language}:`;

    const modelsToTry = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let geminiResponse: Response | null = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
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
                temperature: 0.3,
                maxOutputTokens: 500,
              },
            }),
          }
        );

        if (response.ok) {
          geminiResponse = response;
          break;
        } else {
          lastError = await response.json().catch(() => ({}));
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!geminiResponse) {
      console.error('Gemini explanation call failed:', lastError);
      return NextResponse.json({ success: false, error: 'AI explanation service unavailable' }, { status: 502 });
    }

    const geminiData = await geminiResponse.json();
    const explanation = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!explanation || !explanation.trim()) {
      return NextResponse.json({ success: false, error: 'AI returned empty explanation' }, { status: 502 });
    }

    // Save to cache in document explanations
    if (doc.explanations instanceof Map) {
      doc.explanations.set(langKey, explanation);
    } else {
      if (!doc.explanations) doc.explanations = {};
      doc.explanations[langKey] = explanation;
    }
    
    // Mark modified so mongoose saves the map
    doc.markModified('explanations');
    await doc.save();

    return NextResponse.json({ success: true, explanation, cached: false });
  } catch (error) {
    console.error('Explanation generation error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
