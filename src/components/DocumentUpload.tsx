'use client';

import React, { useState, useCallback } from 'react';

interface DocumentUploadProps {
  patientId: string;
  onUploadSuccess: (fileId: string, fileName: string, mimeType: string, file: File) => void;
  onError: (error: string) => void;
  isLoading?: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  patientId,
  onUploadSuccess,
  onError,
  isLoading = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const file = files[0];
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        
        if (!validTypes.includes(file.type)) {
          onError('Invalid file type. Please upload JPEG, PNG, GIF, or PDF.');
          return;
        }

        if (file.size > 20 * 1024 * 1024) {
          onError('File size exceeds 20MB limit.');
          return;
        }

        setSelectedFile(file);
      }
    },
    [onError]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        
        if (!validTypes.includes(file.type)) {
          onError('Invalid file type. Please upload JPEG, PNG, GIF, or PDF.');
          return;
        }

        if (file.size > 20 * 1024 * 1024) {
          onError('File size exceeds 20MB limit.');
          return;
        }

        setSelectedFile(file);
      }
    },
    [onError]
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      onError('No file selected.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('patientId', patientId);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201 || xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              onUploadSuccess(response.fileId, response.fileName, response.mimeType, selectedFile);
              setSelectedFile(null);
              setUploadProgress(0);
            } else {
              onError(response.error || 'Upload failed');
            }
          } catch (e) {
            onError('Failed to parse upload response');
          }
        } else {
          onError(`Upload failed with status ${xhr.status}`);
        }
        setIsUploading(false);
      });

      xhr.addEventListener('error', () => {
        onError('Upload request failed');
        setIsUploading(false);
      });

      xhr.open('POST', '/api/documents/upload');
      xhr.send(formData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError(errorMessage);
      setIsUploading(false);
    }
  }, [selectedFile, patientId, onUploadSuccess, onError]);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setUploadProgress(0);
  }, []);

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Document</h2>
        <p className="text-gray-600 mb-6">
          Upload a prescription, diagnostic report, or discharge summary (JPEG, PNG, GIF, or PDF)
        </p>

        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50'
            }`}
          >
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
            <p className="text-gray-700 font-medium mb-2">
              {isDragOver ? 'Drop your file here' : 'Drag and drop your file here'}
            </p>
            <p className="text-gray-500 text-sm mb-4">or</p>
            <label className="inline-block">
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".jpg,.jpeg,.png,.gif,.pdf"
                className="hidden"
                disabled={isLoading || isUploading}
              />
              <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 cursor-pointer transition-colors disabled:bg-gray-400">
                Select File
              </span>
            </label>
            <p className="text-gray-500 text-xs mt-4">Maximum file size: 20MB</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center flex-1 min-w-0">
                <svg
                  className="w-8 h-8 text-blue-600 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              {!isUploading && (
                <button
                  onClick={clearSelection}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>

            {isUploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Uploading...</p>
                  <p className="text-sm font-medium text-gray-700">{Math.round(uploadProgress)}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
};
