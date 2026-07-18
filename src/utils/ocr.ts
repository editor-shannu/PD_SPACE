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
      
      if (onProgress) onProgress(0.3);
      
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      if (onProgress) onProgress(0.5);
      
      let fullText = '';
      const numPages = pdf.numPages;
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
        
        if (onProgress) {
          onProgress(0.5 + (i / numPages) * 0.4);
        }
      }
      
      if (onProgress) onProgress(1.0);
      
      const trimmedText = fullText.trim();
      return trimmedText || 'This PDF has no selectable text (it might be scanned).';
    } catch (error) {
      console.error('Failed to parse PDF:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to extract text from PDF');
    }
  }

  // Tesseract.js client-side worker
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
    await worker.terminate();
    throw error;
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
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to extract structured data');
  }

  const data = await response.json();
  if (data.success) {
    return data.extracted_data;
  } else {
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
