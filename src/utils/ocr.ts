import { createWorker } from 'tesseract.js';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src === src) {
        return resolve();
      }
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}

/**
 * Utility function to extract text from image/PDF using Tesseract.js client-side
 */
export async function extractTextFromDocument(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (file.type === 'application/pdf') {
    if (onProgress) onProgress(0.1);
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error('PDF.js failed to load.');
      }
      
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      if (onProgress) onProgress(0.2);
      
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      if (onProgress) onProgress(0.3);
      
      let fullText = '';
      const numPages = pdf.numPages;
      let hasSelectableText = false;
      
      // Attempt to extract selectable text first
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        if (pageText.trim().length > 0) {
          hasSelectableText = true;
        }
        fullText += pageText + '\n';
      }
      
      // If the PDF has searchable text, return it
      if (hasSelectableText && fullText.trim().length > 30) {
        if (onProgress) onProgress(1.0);
        return fullText.trim();
      }

      // Fallback: PDF has no selectable text (scanned PDF). Run Tesseract OCR on rendered page canvases!
      console.log('PDF has no selectable text. Falling back to page-by-page OCR rendering...');
      if (onProgress) onProgress(0.4);

      const worker = await createWorker('eng');
      let ocrText = '';
      
      for (let i = 1; i <= numPages; i++) {
        if (onProgress) {
          onProgress(0.4 + (i / numPages) * 0.5);
        }
        
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Scale 1.5 balances speed & resolution for OCR
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Convert canvas to image and recognize text
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const { data: { text } } = await worker.recognize(dataUrl);
        ocrText += text + '\n';
      }
      
      await worker.terminate();
      if (onProgress) onProgress(1.0);
      
      return ocrText.trim() || 'No text could be extracted from this PDF.';
    } catch (error) {
      console.error('Failed to parse PDF:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to extract text from PDF');
    }
  }

  // Tesseract.js client-side worker for image uploads
  const worker = await createWorker('eng');
  
  try {
    if (onProgress) {
      onProgress(0.2);
    }
    const { data: { text } } = await worker.recognize(file);
    if (onProgress) {
      onProgress(1.0);
    }
    await worker.terminate();
    return text || 'No text could be extracted from this image.';
  } catch (error) {
    try {
      await worker.terminate();
    } catch (_) {}
    throw error;
  }
}

export class ValidationError extends Error {
  isValidationError: boolean;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    this.isValidationError = true;
  }
}

/**
 * Utility function to send raw text to our Gemini API endpoint for structured extraction
 */
export async function extractStructuredData(
  rawText: string,
  documentTypeHint?: 'prescription' | 'diagnostic_report' | 'discharge_summary' | 'other'
): Promise<any> {
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw_text: rawText,
      document_type_hint: documentTypeHint,
    }),
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {}
    
    if (errorData.isValidationError) {
      throw new ValidationError(errorData.error || 'Invalid medical document');
    }
    throw new Error(errorData.error || 'Failed to extract structured data');
  }

  const data = await response.json();
  if (data.success) {
    return data.extracted_data;
  } else {
    if (data.isValidationError) {
      throw new ValidationError(data.error || 'Invalid medical document');
    }
    throw new Error(data.error || 'Failed to extract structured data');
  }
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
