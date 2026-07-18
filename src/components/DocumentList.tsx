'use client';

import React from 'react';
import { Document } from '@/types/documents';

interface DocumentListProps {
  documents: Document[];
  isLoading?: boolean;
  onViewDetails?: (document: Document) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading = false,
  onViewDetails,
}) => {
  const formatDate = (date?: Date | string) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      prescription: 'Prescription',
      diagnostic_report: 'Diagnostic Report',
      discharge_summary: 'Discharge Summary',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      prescription: 'bg-blue-100 text-blue-800',
      diagnostic_report: 'bg-purple-100 text-purple-800',
      discharge_summary: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-600 font-medium">No documents uploaded yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Start by uploading your first document
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Your Documents</h2>
          <p className="text-sm text-gray-600">Total: {documents.length}</p>
        </div>

        <div className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <div
              key={doc._id || doc.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="w-8 h-8 text-blue-600"
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
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 break-words">
                        {doc.fileName}
                      </p>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getDocumentTypeColor(
                          doc.extractedData.document_type
                        )}`}
                      >
                        {getDocumentTypeLabel(doc.extractedData.document_type)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-sm text-gray-600 md:grid-cols-2">
                      <div>
                        <span className="font-medium">Doctor:</span>{' '}
                        {doc.extractedData.doctor_name || 'Not specified'}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span>{' '}
                        {formatDate(doc.extractedData.date)}
                      </div>
                    </div>

                    {doc.extractedData.diagnosis && (
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Diagnosis:</span>{' '}
                        {doc.extractedData.diagnosis.substring(0, 100)}
                        {doc.extractedData.diagnosis.length > 100 ? '...' : ''}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Uploaded: {formatDate(doc.createdAt)}</span>
                      {doc.isConfirmed && (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Confirmed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(doc)}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                  >
                    View Details →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
