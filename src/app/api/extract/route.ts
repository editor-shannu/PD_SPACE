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

function calculateBigramSpamScore(alpha: string): number {
  const commonBigrams = new Set([
    "th", "he", "in", "er", "an", "re", "on", "en", "at", "es",
    "ed", "nd", "to", "or", "ea", "ti", "ar", "te", "ng", "al",
    "it", "as", "is", "ha", "et", "se", "ou", "of", "le", "sa",
    "ve", "ro", "hi", "ri", "ic", "ne", "st", "li", "de", "ra",
    "ld", "ur", "ce", "co", "no", "me", "io", "ly", "si", "gh",
    "ow", "nt", "tr", "pr", "ll", "ss", "sh", "ge", "ni", "la",
    "un", "wh", "pa", "ma", "ca", "pe", "di", "ho", "ta", "wi",
    "be", "fo", "ac", "wa", "ct", "mi", "ag", "el", "om", "us",
    "il", "do", "we", "ns", "pl", "fe", "lo", "so", "ru", "pu",
    "pi", "ab", "po", "ch", "bi", "su", "na", "fi", "ad", "mo",
    "sp", "qu", "ev", "bo", "sc", "gr", "bu", "cl", "if", "go",
    "tu", "am", "by", "op", "fa", "im", "wr", "wo", "ys"
  ]);
  
  if (alpha.length < 4) return 0;
  let unknown = 0;
  const total = alpha.length - 1;
  for (let i = 0; i < total; i++) {
    const bg = alpha.slice(i, i + 2);
    if (!commonBigrams.has(bg)) {
      unknown++;
    }
  }
  return unknown / total;
}

function isStructuralGarbage(text: string): { isGarbage: boolean; reason?: string } {
  const norm = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const alpha = norm.replace(/[^a-z]/g, '');
  const words = norm.split(' ');

  // 1. Length constraint
  if (text.length < 8 || words.length < 2) {
    return { isGarbage: true, reason: "Input is too short to express a meaningful document." };
  }

  if (alpha.length > 0) {
    // 2. Unique character distribution
    const uniqueChars = new Set(alpha.split(''));
    const uniqueRatio = uniqueChars.size / alpha.length;
    if (uniqueRatio < 0.25) {
      return { isGarbage: true, reason: "Failed character distribution check (potential spam)." };
    }

    // 3. Monotonous single character repetition
    const freq: { [key: string]: number } = {};
    for (const char of alpha) {
      freq[char] = (freq[char] || 0) + 1;
    }
    const maxFreq = Math.max(...Object.values(freq));
    if (maxFreq / alpha.length > 0.40) {
      return { isGarbage: true, reason: "Dominant single character exceeds safety threshold." };
    }
  }

  // 4. Runaway consecutive characters
  const consecutiveMatch = text.toLowerCase().match(/(.)\1{4,}/g);
  if (consecutiveMatch && consecutiveMatch.length > 0) {
    return { isGarbage: true, reason: "Excessive consecutive repeated characters detected." };
  }

  // 5. Semantic Bigram Frequency Filter
  if (alpha.length >= 6) {
    const spamScore = calculateBigramSpamScore(alpha);
    if (spamScore > 0.55) {
      return { isGarbage: true, reason: "Unreadable text geometry (keyboard smash layout)." };
    }
  }

  return { isGarbage: false };
}

// Structured extraction prompt for Gemini API
function buildExtractionPrompt(rawText: string, documentTypeHint?: string): string {
  const typeHint = documentTypeHint ? `Document type hint: ${documentTypeHint}\n\n` : '';

  return `You are a medical document parsing assistant.
First, check if the provided text is a legitimate medical/hospital document (like a doctor's prescription, diagnostic test report, lab report, hospital discharge summary, referral letter, clinical note, or medical invoice).
If the text is NOT a medical/hospital document (for example, if it is a general project report, programming code, presentation slide, recipe, personal letter, non-medical document, or random gibberish), then mark "is_valid_medical_document" as false, and provide the reason in "invalid_reason". Otherwise, mark "is_valid_medical_document" as true.

Extract structured data from the following medical document text and return a JSON object with this exact schema:

{
  "is_valid_medical_document": boolean (required),
  "invalid_reason": string (optional, specify why it is not a medical/hospital document if is_valid_medical_document is false),
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

    // Fast Structural Shield Check
    const structuralCheck = isStructuralGarbage(raw_text);
    if (structuralCheck.isGarbage) {
      return NextResponse.json(
        { success: false, error: `Wrong file: ${structuralCheck.reason}` },
        { status: 400 }
      );
    }

    // Call FastAPI Semantic Document Validation Service
    try {
      const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
      console.log(`[DEBUG] Calling FastAPI validation microservice at: ${fastApiUrl}/api/v1/validate-document`);
      const validationResponse = await fetch(`${fastApiUrl}/api/v1/validate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: raw_text }),
      });

      if (validationResponse.ok) {
        const validationData = await validationResponse.json();
        console.log('[DEBUG] FastAPI validation response:', validationData);
        if (validationData.valid === false) {
          return NextResponse.json(
            { 
              success: false, 
              error: validationData.reason || 'Wrong file: The uploaded document is not related to hospital/medical records.' 
            },
            { status: 400 }
          );
        }
      } else {
        console.warn('FastAPI validation service returned non-200 status:', validationResponse.status);
      }
    } catch (fastApiError) {
      // Log the error but fallback to Gemini's internal validation to keep the app working if the microservice is down/unreachable
      console.error('Failed to communicate with FastAPI validation service, falling back to Gemini:', fastApiError);
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

    // Call Gemini API (using standard gemini-1.5-flash model)
    const geminiResponse = await fetch(
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

    if (validationResult.data.is_valid_medical_document === false) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.data.invalid_reason || 'Wrong file: Uploaded document is not related to hospital/medical records.'
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
