/**
 * Utility function to extract text from image/PDF using Tesseract.js
 */
export async function extractTextFromDocument(file: File): Promise<string> {
  // This will be implemented later with actual Tesseract.js
  throw new Error('Not implemented');
}

/**
 * Utility function to send raw text to Gemini API for structured extraction
 */
export async function extractStructuredData(rawText: string): Promise<any> {
  // This will be implemented later with actual Gemini API
  throw new Error('Not implemented');
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
