'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { DocumentUpload } from '@/components/DocumentUpload';
import { OCRPreview } from '@/components/OCRPreview';
import { ConfirmExtraction } from '@/components/ConfirmExtraction';
import { DocumentList } from '@/components/DocumentList';
import { ExtractedData, Document } from '@/types/documents';

type UploadStep = 'upload' | 'ocr' | 'confirmation' | 'success' | 'list';

interface UploadState {
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  rawText?: string;
  extractedData?: ExtractedData;
  documents?: Document[];
}

// Mock function to simulate OCR and extraction
// In production, this would call the backend API
const mockOCRAndExtraction = async (fileId: string): Promise<ExtractedData> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    document_type: 'prescription',
    doctor_name: 'Dr. John Smith',
    date: new Date('2024-01-15'),
    diagnosis: 'Type 2 Diabetes Mellitus',
    medications: [
      {
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
      },
      {
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
      },
    ],
    follow_up_date: new Date('2024-02-15'),
    notes: 'Monitor blood glucose levels regularly. Schedule follow-up lab tests.',
  };
};

const PatientUploadPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<UploadStep>('list');
  const [uploadState, setUploadState] = useState<UploadState>({});
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Mock patient ID - in real app, get from session/context
  const patientId = 'patient-123';

  // Load documents on mount (mock)
  useEffect(() => {
    // In real app, fetch from API
    setDocuments([
      {
        _id: '1',
        userId: patientId,
        fileName: 'Prescription_Jan2024.pdf',
        fileType: 'pdf',
        rawText: 'Dr. Smith prescription...',
        extractedData: {
          document_type: 'prescription',
          doctor_name: 'Dr. Smith',
          date: new Date('2024-01-15'),
          diagnosis: 'Hypertension',
          medications: [
            { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' },
          ],
          notes: 'Take with food',
        },
        isConfirmed: true,
        createdAt: new Date('2024-01-15'),
      },
    ]);
  }, [patientId]);

  const handleUploadSuccess = useCallback(
    (fileId: string, fileName: string, mimeType: string, rawText: string) => {
      setError('');
      setUploadState({
        fileId,
        fileName,
        mimeType,
        rawText,
      });
      setCurrentStep('ocr');
      handleOCRExtraction(fileId);
    },
    []
  );

  const handleOCRExtraction = useCallback(async (fileId: string) => {
    setIsLoading(true);
    setError('');

    try {
      // In production, call backend API
      // const response = await fetch('/api/extract', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ fileId }),
      // });

      const extractedData = await mockOCRAndExtraction(fileId);

      setUploadState((prev) => ({
        ...prev,
        extractedData,
      }));

      setCurrentStep('confirmation');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Extraction failed';
      setError(errorMessage);
      setCurrentStep('upload');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConfirmExtraction = useCallback(async (data: ExtractedData) => {
    setIsLoading(true);
    setError('');

    try {
      const confirmPayload = {
        file_id: uploadState.fileId,
        extracted_data: data,
        patientId,
        fileName: uploadState.fileName,
        mimeType: uploadState.mimeType,
      };

      const response = await fetch('/api/documents/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmPayload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save document');
      }

      // Add new document to list
      if (result.document) {
        setDocuments((prev) => [result.document, ...prev]);
      }

      setCurrentStep('success');

      // Reset to list after 2 seconds
      setTimeout(() => {
        setCurrentStep('list');
        setUploadState({});
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [uploadState, patientId]);

  const handleCancel = useCallback(() => {
    setCurrentStep('list');
    setUploadState({});
    setError('');
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  const handleViewDetails = useCallback((doc: Document) => {
    // In a real app, navigate to document details page
    console.log('View details for:', doc);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Medical Documents</h1>
          <p className="text-lg text-gray-600">
            Upload and manage your medical documents
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <svg
                className="w-5 h-5 text-red-600 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col items-center">
          {/* Step Indicator */}
          {currentStep !== 'list' && (
            <div className="w-full max-w-2xl mb-8">
              <div className="flex items-center justify-between mb-4">
                {(['upload', 'ocr', 'confirmation', 'success'] as const).map(
                  (step, index) => (
                    <React.Fragment key={step}>
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm ${
                          step === currentStep
                            ? 'bg-blue-600 text-white'
                            : ['upload', 'ocr', 'confirmation'].indexOf(step) <
                              ['upload', 'ocr', 'confirmation', 'success'].indexOf(currentStep)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {['upload', 'ocr', 'confirmation', 'success'].indexOf(step) <
                        ['upload', 'ocr', 'confirmation', 'success'].indexOf(currentStep) ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      {index < 3 && (
                        <div
                          className={`flex-1 h-1 ${
                            ['upload', 'ocr', 'confirmation'].indexOf(step) <
                            ['upload', 'ocr', 'confirmation', 'success'].indexOf(
                              currentStep
                            )
                              ? 'bg-green-600'
                              : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  )
                )}
              </div>
              <div className="flex justify-between text-xs font-medium text-gray-600">
                <span>Upload</span>
                <span>Preview</span>
                <span>Confirm</span>
                <span>Done</span>
              </div>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 'upload' && (
            <DocumentUpload
              patientId={patientId}
              onUploadSuccess={handleUploadSuccess}
              onError={handleError}
              isLoading={isLoading}
            />
          )}

          {currentStep === 'ocr' && uploadState.rawText && (
            <OCRPreview
              rawText={uploadState.rawText}
              fileName={uploadState.fileName}
              confidence={85}
            />
          )}

          {currentStep === 'confirmation' && uploadState.extractedData && (
            <ConfirmExtraction
              extractedData={uploadState.extractedData}
              fileName={uploadState.fileName}
              onConfirm={handleConfirmExtraction}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          )}

          {currentStep === 'success' && (
            <div className="w-full max-w-2xl">
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Document Saved Successfully!
                </h3>
                <p className="text-gray-600 mb-6">
                  Your document has been uploaded and processed. Redirecting...
                </p>
              </div>
            </div>
          )}

          {currentStep === 'list' && (
            <>
              <div className="w-full mb-8">
                <button
                  onClick={() => {
                    setCurrentStep('upload');
                    setError('');
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Upload New Document
                </button>
              </div>

              <DocumentList
                documents={documents}
                isLoading={isLoading}
                onViewDetails={handleViewDetails}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientUploadPage;
