/**
 * User interface
 */
export interface User {
  _id?: string;
  id?: string;
  email: string;
  name: string;
  role?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Medication interface - represents a single medication entry
 */
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

/**
 * ExtractedData interface - structured JSON extracted by AI from document
 */
export interface ExtractedData {
  document_type: 'prescription' | 'diagnostic_report' | 'discharge_summary' | 'other';
  doctor_name?: string;
  date?: Date;
  diagnosis?: string;
  medications: Medication[];
  follow_up_date?: Date;
  notes?: string;
}

/**
 * Document interface - represents an uploaded and processed document
 */
export interface Document {
  _id?: string;
  id?: string;
  userId: string;
  fileName: string;
  fileUrl?: string;
  fileType: 'image' | 'pdf';
  rawText: string;
  extractedData: ExtractedData;
  isConfirmed: boolean;
  explanations?: Record<string, string>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * OCR Result interface - output from Tesseract.js
 */
export interface OCRResult {
  text: string;
  confidence: number;
}

/**
 * API response interface for document processing
 */
export interface DocumentProcessingResponse {
  success: boolean;
  message: string;
  document?: Document;
  error?: string;
}
