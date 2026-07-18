import { z } from 'zod';

// Zod schemas for validation

export const MedicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
});

export const ExtractedDataSchema = z.object({
  is_valid_medical_document: z.boolean().optional(),
  invalid_reason: z.string().optional(),
  document_type: z.enum(['prescription', 'diagnostic_report', 'discharge_summary', 'other']).optional().default('other'),
  doctor_name: z.string().optional(),
  date: z.coerce.date().optional(),
  diagnosis: z.string().optional(),
  medications: z.array(MedicationSchema).optional().default([]),
  follow_up_date: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const DocumentSchema = z.object({
  userId: z.string(),
  fileName: z.string().min(1),
  fileUrl: z.string().optional(),
  fileType: z.enum(['image', 'pdf']),
  rawText: z.string(),
  extractedData: ExtractedDataSchema,
  isConfirmed: z.boolean().default(false),
});

export type ExtractedDataType = z.infer<typeof ExtractedDataSchema>;
export type MedicationType = z.infer<typeof MedicationSchema>;
export type DocumentType = z.infer<typeof DocumentSchema>;
