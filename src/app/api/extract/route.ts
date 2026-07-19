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
  // 1. Length constraint
  if (text.length < 8) {
    return { isGarbage: true, reason: "Input is too short to express a meaningful document." };
  }

  // 2. Alphanumeric presence constraint (must contain at least some letters or numbers)
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(text);
  if (!hasAlphanumeric) {
    return { isGarbage: true, reason: "Input does not contain any alphanumeric characters." };
  }

  // 3. Runaway letters repetition (e.g. "aaaaaaaaaa" or "xxxxxxxxxx"), ignoring spaces, underscores, dots, and numbers
  const consecutiveMatch = text.toLowerCase().match(/([a-z])\1{9,}/g);
  if (consecutiveMatch && consecutiveMatch.length > 0) {
    return { isGarbage: true, reason: "Excessive consecutive repeated characters detected." };
  }

  return { isGarbage: false };
}

// Helper to check if text contains obvious medical/healthcare keywords
function containsMedicalKeywords(text: string): boolean {
  const normalized = text.toLowerCase();
  const medicalKeywords = [
    'rx', 'prescription', 'tablet', 'tab', 'capsule', 'cap', 'mg', 'ml', 'mcg',
    'doctor', 'physician', 'patient', 'diagnose', 'diagnosis', 'symptom',
    'hospital', 'clinic', 'medical', 'medicine', 'report', 'laboratory', 'lab',
    'urine', 'blood', 'hemoglobin', 'wbc', 'platelets', 'glucose', 'creatinine',
    'fever', 'cough', 'pain', 'dose', 'dosage', 'directed', 'once daily', 'twice daily',
    'temperature', 'pressure', 'pulse', 'spo2'
  ];
  return medicalKeywords.some(keyword => {
    if (keyword.length <= 3) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(normalized);
    }
    return normalized.includes(keyword);
  });
}

// Structured extraction prompt for Gemini API
function buildExtractionPrompt(rawText: string, documentTypeHint?: string): string {
  const typeHint = documentTypeHint ? `Document type hint: ${documentTypeHint}\n\n` : '';

  return `You are a medical document parsing assistant.
IMPORTANT: Prescriptions are sometimes handwritten and can be hard to read, resulting in noisy OCR text, spelling mistakes, or disjointed letters. Even if the text is messy, noisy, or hard to read, if it contains medical terms, doctor names/headers, patient details, vital signs, or medicine names, you MUST treat it as a valid medical document ("is_valid_medical_document": true). Use your medical knowledge to correct typos, infer misspelled medicine names (e.g. "paraceta-ol" -> "Paracetamol"), and extract all possible fields.

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

function cleanNullValues(obj: any): any {
  if (obj === null) {
    return undefined;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanNullValues(item));
  }
  if (typeof obj === 'object' && obj !== undefined) {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== null) {
        cleaned[key] = cleanNullValues(val);
      }
    }
    return cleaned;
  }
  return obj;
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
        { success: false, error: `Wrong file: ${structuralCheck.reason}`, isValidationError: true },
        { status: 400 }
      );
    }

    // Call FastAPI Semantic Document Validation Service if not obviously medical
    const isObviousMedical = containsMedicalKeywords(raw_text);
    if (!isObviousMedical) {
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
                error: validationData.reason || 'Wrong file: The uploaded document is not related to hospital/medical records.',
                isValidationError: true
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
    } else {
      console.log('[DEBUG] Document contains obvious medical keywords; bypassing FastAPI validation microservice.');
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

    // Try calling Gemini API with a fallback chain of models
    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro'];
    let geminiResponse: Response | null = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[DEBUG] Attempting extraction with model: ${model}`);
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
                temperature: 0.1, // Low temperature for deterministic output
                topK: 1,
                topP: 1,
                maxOutputTokens: 2048,
              },
            }),
          }
        );

        if (response.ok) {
          geminiResponse = response;
          break;
        } else {
          const errBody = await response.json().catch(() => ({}));
          console.warn(`[DEBUG] Model ${model} failed with status ${response.status}:`, errBody);
          lastError = errBody;
        }
      } catch (err) {
        console.error(`[DEBUG] Fetch error for model ${model}:`, err);
        lastError = err;
      }
    }

    if (!geminiResponse) {
      console.error('All Gemini API models failed. Last error:', lastError);
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
      extractedJson = cleanNullValues(extractedJson);
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
          error: validationResult.data.invalid_reason || 'Wrong file: Uploaded document is not related to hospital/medical records.',
          isValidationError: true
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
