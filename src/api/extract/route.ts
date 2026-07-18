/**
 * POST /api/extract
 * Accepts { raw_text, document_type_hint } (optional)
 * Calls Gemini API with structured extraction prompt
 * Returns parsed JSON matching ExtractedData schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExtractedDataSchema } from '@/lib/validation';
import { z } from 'zod';

interface ExtractRequest {
  raw_text: string;
  document_type_hint?: 'prescription' | 'diagnostic_report' | 'discharge_summary' | 'other';
}

interface ExtractResponse {
  success: boolean;
  extracted_data?: z.infer<typeof ExtractedDataSchema>;
  error?: string;
}

// Structured extraction prompt for Gemini API
function buildExtractionPrompt(rawText: string, documentTypeHint?: string): string {
  const typeHint = documentTypeHint ? `Document type hint: ${documentTypeHint}\n\n` : '';

  return `You are a medical document parsing assistant. Extract structured data from the following medical document text and return a JSON object with this exact schema:

{
  "document_type": "prescription" | "diagnostic_report" | "discharge_summary" | "other",
  "doctor_name": string (optional),
  "date": ISO 8601 date string (optional),
  "diagnosis": string (optional),
  "medications": [
    {
      "name": string (required),
      "dosage": string (optional),
      "frequency": string (optional)
    }
  ],
  "follow_up_date": ISO 8601 date string (optional),
  "notes": string (optional)
}

${typeHint}

Medical Document Text:
${rawText}

Return ONLY valid JSON, no additional text or markdown formatting. Ensure all dates are in ISO 8601 format (YYYY-MM-DD).`;
}

export async function POST(req: NextRequest): Promise<NextResponse<ExtractResponse>> {
  try {
    const body = (await req.json()) as ExtractRequest;
    const { raw_text, document_type_hint } = body;

    // Validation
    if (!raw_text || raw_text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'raw_text is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Get Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY is not set');
      return NextResponse.json(
        { success: false, error: 'API configuration error' },
        { status: 500 }
      );
    }

    // Build extraction prompt
    const prompt = buildExtractionPrompt(raw_text, document_type_hint);

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
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
            temperature: 0.1, // Low temperature for deterministic output
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to extract data from Gemini API' },
        { status: 502 }
      );
    }

    const geminiData = await geminiResponse.json();

    // Extract text content from Gemini response
    const extractedText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!extractedText) {
      return NextResponse.json(
        { success: false, error: 'No content received from Gemini API' },
        { status: 502 }
      );
    }

    // Parse JSON response
    let extractedJson;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      extractedJson = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError, 'Response text:', extractedText);
      return NextResponse.json(
        { success: false, error: 'Failed to parse extracted JSON' },
        { status: 502 }
      );
    }

    // Validate against schema
    const validationResult = ExtractedDataSchema.safeParse(extractedJson);

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return NextResponse.json(
        {
          success: false,
          error: `Validation failed: ${validationResult.error.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        extracted_data: validationResult.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Extract error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to extract data';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
