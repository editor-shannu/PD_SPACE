import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/document';

interface RecommendRequest {
  symptoms: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const patientId = (session.user as any).id;

    const { symptoms } = (await req.json()) as RecommendRequest;
    if (!symptoms || !symptoms.trim()) {
      return NextResponse.json({ success: false, error: 'Symptoms are required' }, { status: 400 });
    }

    // Connect to database and fetch patient history
    await connectDB();
    const documents = await DocumentModel.find({ userId: patientId, isConfirmed: true })
      .sort({ createdAt: -1 })
      .lean();

    // Extract unique diagnoses and medications
    const diagnoses = new Set<string>();
    const medications = new Set<string>();

    documents.forEach((doc) => {
      if (doc.extractedData?.diagnosis) {
        diagnoses.add(doc.extractedData.diagnosis);
      }
      if (doc.extractedData?.medications) {
        doc.extractedData.medications.forEach((med: any) => {
          if (med.name) {
            medications.add(`${med.name}${med.dosage ? ` (${med.dosage})` : ''}`);
          }
        });
      }
    });

    const diagnosesList = diagnoses.size > 0 ? Array.from(diagnoses).join(', ') : 'None recorded';
    const medicationsList = medications.size > 0 ? Array.from(medications).join(', ') : 'None recorded';

    // Call Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
    }

    const prompt = `You are a medical triage assistant.
Given the patient's symptoms and their recent medical history, recommend the most appropriate medical department, urgency level, and a concise clinical reasoning.

Patient Symptoms:
"${symptoms}"

Patient History:
- Diagnoses: ${diagnosesList}
- Medications: ${medicationsList}

You must return a raw JSON object (and nothing else, no markdown codeblocks or prefix/suffix) conforming to this schema:
{
  "recommended_department": "Name of the medical department (e.g. Cardiology, Neurology, Pediatrics, Dermatology, General Medicine, Orthopedics, etc.)",
  "urgency_level": "routine" | "soon" | "urgent",
  "reasoning": "A concise explanation of why this department is recommended and the triage level selected."
}

Ensure the output is valid JSON.`;

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
                temperature: 0.2,
                topK: 1,
                topP: 1,
                maxOutputTokens: 1024,
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
      console.error('Gemini API call failed for recommendations:', lastError);
      return NextResponse.json({ success: false, error: 'AI recommendation service unavailable' }, { status: 502 });
    }

    const geminiData = await geminiResponse.json();
    let text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      return NextResponse.json({ success: false, error: 'Received empty recommendation' }, { status: 502 });
    }

    let parsedRecommendation: any = null;
    let parseSuccess = false;

    // Clean text of common markdown wrappers
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    }

    // Try parsing clean text
    try {
      parsedRecommendation = JSON.parse(cleanedText);
      parseSuccess = true;
    } catch (e) {
      // Try extracting content between first '{' and last '}'
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsedRecommendation = JSON.parse(cleanedText.substring(firstBrace, lastBrace + 1));
          parseSuccess = true;
        } catch (subError) {
          console.warn('JSON substring parsing failed:', subError);
        }
      }
    }

    if (!parseSuccess) {
      console.error('Failed to parse Gemini JSON:', text);
      return NextResponse.json({ success: false, error: 'Failed to parse AI response' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      recommendation: {
        recommended_department: parsedRecommendation.recommended_department || 'General Medicine',
        urgency_level: parsedRecommendation.urgency_level || 'routine',
        reasoning: parsedRecommendation.reasoning || 'Based on symptoms and patient history.',
      },
    });
  } catch (error) {
    console.error('Specialist recommendation error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
