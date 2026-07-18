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
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload'); // Default to upload to start the flow immediately
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
    console.log('View details for:', doc);
  }, []);

  return (
    <div className="min-h-[80vh] bg-gray-50 flex flex-col items-center">
      <div className="w-full max-w-4xl px-2 py-6">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#003893] tracking-tight">Upload Medical Document</h1>
            <p className="text-xs text-gray-400 font-semibold">
              Extract, verify, and save your health records securely
            </p>
          </div>
          {currentStep !== 'list' && (
            <button
              onClick={handleCancel}
              className="self-start sm:self-auto px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl shadow-sm transition"
            >
              Cancel Flow
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-bold text-red-800 text-xs uppercase tracking-wider">Error Occurred</p>
              <p className="text-red-700 text-xs font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="w-full flex flex-col items-center">
          {/* Step Indicator */}
          {currentStep !== 'list' && (
            <div className="w-full max-w-xl mb-8">
              <div className="flex items-center justify-between mb-3">
                {(['upload', 'ocr', 'confirmation', 'success'] as const).map(
                  (step, index) => (
                    <React.Fragment key={step}>
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs shadow-sm transition-all duration-300 ${
                          step === currentStep
                            ? 'bg-[#003893] text-white ring-4 ring-[#003893]/15'
                            : ['upload', 'ocr', 'confirmation'].indexOf(step) <
                              ['upload', 'ocr', 'confirmation', 'success'].indexOf(currentStep)
                            ? 'bg-[#33aed6] text-white'
                            : 'bg-white border border-gray-200 text-gray-400'
                        }`}
                      >
                        {['upload', 'ocr', 'confirmation', 'success'].indexOf(step) <
                        ['upload', 'ocr', 'confirmation', 'success'].indexOf(currentStep) ? (
                          <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      {index < 3 && (
                        <div
                          className={`flex-1 h-0.5 transition-all duration-500 ${
                            ['upload', 'ocr', 'confirmation'].indexOf(step) <
                            ['upload', 'ocr', 'confirmation', 'success'].indexOf(currentStep)
                              ? 'bg-[#33aed6]'
                              : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  )
                )}
              </div>
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                <span>Upload</span>
                <span>Extracting</span>
                <span>Confirm</span>
                <span>Success</span>
              </div>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 'upload' && (
            <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <DocumentUpload
                patientId={patientId}
                onUploadSuccess={handleUploadSuccess}
                onError={handleError}
                isLoading={isLoading}
              />
            </div>
          )}

          {currentStep === 'ocr' && uploadState.rawText && (
            <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <OCRPreview
                rawText={uploadState.rawText}
                fileName={uploadState.fileName}
                confidence={85}
              />
            </div>
          )}

          {currentStep === 'confirmation' && uploadState.extractedData && (
            <div className="w-full max-w-3xl">
              <ConfirmExtraction
                extractedData={uploadState.extractedData}
                fileName={uploadState.fileName}
                onConfirm={handleConfirmExtraction}
                onCancel={handleCancel}
                isLoading={isLoading}
              />
            </div>
          )}

          {currentStep === 'success' && (
            <div className="w-full max-w-xl">
              <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 text-center space-y-4">
                <div className="mx-auto h-16 w-16 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-[#003893] tracking-tight">
                  Document Saved Successfully!
                </h3>
                <p className="text-xs text-gray-400 font-semibold max-w-xs mx-auto">
                  Your structured medical record has been securely linked and saved to MongoDB. Redirecting...
                </p>
              </div>
            </div>
          )}

          {currentStep === 'list' && (
            <div className="w-full max-w-4xl space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setCurrentStep('upload');
                    setError('');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#003893] hover:bg-[#0b4497] text-white text-xs font-bold rounded-2xl shadow-md transition duration-200 uppercase tracking-wider"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  New Upload
                </button>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <DocumentList
                  documents={documents}
                  isLoading={isLoading}
                  onViewDetails={handleViewDetails}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default PatientUploadPage;
