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
      prescription: 'bg-blue-50 text-[#003893] border border-blue-100',
      diagnostic_report: 'bg-cyan-50 text-[#33aed6] border border-cyan-100',
      discharge_summary: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      other: 'bg-gray-50 text-gray-500 border border-gray-100',
    };
    return colors[type] || 'bg-gray-50 text-gray-500';
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="w-full text-center py-10 space-y-3">
        <div className="mx-auto h-12 w-12 bg-sky-50 rounded-full flex items-center justify-center text-[#33aed6]">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-600 font-bold text-sm">No records found</p>
        <p className="text-gray-400 text-xs font-semibold">Upload a document to parse it with AI</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="divide-y divide-gray-100">
        {documents.map((doc) => (
          <div
            key={doc._id || doc.id}
            className="py-5 first:pt-0 last:pb-0 hover:bg-gray-50/50 rounded-2xl px-2 transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex-shrink-0 mt-1 h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#003893]">
                  <svg
                    className="w-5 h-5"
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
                    <p className="text-sm font-bold text-gray-800 break-words">
                      {doc.fileName}
                    </p>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap tracking-wide ${getDocumentTypeColor(
                        doc.extractedData?.document_type || 'other'
                      )}`}
                    >
                      {getDocumentTypeLabel(doc.extractedData?.document_type || 'other')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1 text-xs text-gray-500 font-semibold md:grid-cols-2">
                    <div>
                      <span className="text-gray-400">Doctor:</span>{' '}
                      {doc.extractedData?.doctor_name || 'Not specified'}
                    </div>
                    <div>
                      <span className="text-gray-400">Date:</span>{' '}
                      {formatDate(doc.extractedData?.date)}
                    </div>
                  </div>

                  {doc.extractedData?.diagnosis && (
                    <p className="text-xs text-gray-500 mt-2 font-medium">
                      <span className="text-gray-400 font-bold">Diagnosis:</span>{' '}
                      {doc.extractedData.diagnosis.substring(0, 100)}
                      {doc.extractedData.diagnosis.length > 100 ? '...' : ''}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <span>Uploaded: {formatDate(doc.createdAt)}</span>
                    {doc.isConfirmed && (
                      <span className="flex items-center gap-1 text-green-600">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
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
                  className="px-3.5 py-1.5 text-xs font-bold text-[#33aed6] hover:text-[#003893] hover:bg-sky-50 rounded-xl transition whitespace-nowrap uppercase tracking-wider border border-[#33aed6]/20"
                >
                  Details
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
