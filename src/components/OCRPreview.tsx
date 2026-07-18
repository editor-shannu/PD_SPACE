'use client';

import React from 'react';

interface OCRPreviewProps {
  rawText: string;
  confidence?: number;
  fileName?: string;
}

export const OCRPreview: React.FC<OCRPreviewProps> = ({
  rawText,
  confidence = 85,
  fileName,
}) => {
  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">OCR Preview</h2>
        <p className="text-gray-600 mb-6">
          Raw text extracted from your document
        </p>

        {fileName && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">File:</span> {fileName}
            </p>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Extracted Text
            </label>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  confidence >= 80
                    ? 'bg-green-500'
                    : confidence >= 60
                    ? 'bg-yellow-500'
                    : 'bg-orange-500'
                }`}
              />
              <span className="text-sm font-medium text-gray-700">
                Confidence: {confidence}%
              </span>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={rawText}
              readOnly
              className="w-full h-64 p-4 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm resize-none focus:outline-none"
              placeholder="No text extracted"
            />
          </div>

          <p className="text-xs text-gray-500 mt-2">
            This is the raw text extracted by OCR. You can review and correct specific fields in the next step.
          </p>
        </div>

        {rawText.length === 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ No text was extracted from the document. This might be a scanned image with poor quality or a blank document. Please try uploading a clearer image.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
