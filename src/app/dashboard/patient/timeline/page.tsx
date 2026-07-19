'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Document } from '@/types/documents';
import { DocumentDetailModal } from '@/components/DocumentDetailModal';

type VisualType = 'consultation' | 'medication' | 'test' | 'treatment';

interface VisualConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: React.ReactNode;
}

const typeConfigs: Record<VisualType, VisualConfig> = {
  medication: {
    label: 'Medication',
    color: '#6366f1',
    bgColor: 'bg-indigo-50/80',
    borderColor: 'border-indigo-100',
    textColor: 'text-indigo-600',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  test: {
    label: 'Test / Lab Report',
    color: '#2ab8d8',
    bgColor: 'bg-cyan-50/80',
    borderColor: 'border-cyan-100',
    textColor: 'text-cyan-600',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  treatment: {
    label: 'Treatment / Discharge',
    color: '#10b981',
    bgColor: 'bg-emerald-50/80',
    borderColor: 'border-emerald-100',
    textColor: 'text-emerald-600',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  consultation: {
    label: 'Consultation',
    color: '#f59e0b',
    bgColor: 'bg-amber-50/80',
    borderColor: 'border-amber-100',
    textColor: 'text-amber-600',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
};

const mapDocumentToVisualType = (docType?: string): VisualType => {
  if (docType === 'prescription') return 'medication';
  if (docType === 'diagnostic_report') return 'test';
  if (docType === 'discharge_summary') return 'treatment';
  return 'consultation';
};

export default function TimelinePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data = await res.json();
          // Sort descending by date from extractedData, falling back to createdAt
          const sorted = (data.documents || []).sort((a: Document, b: Document) => {
            const dateA = a.extractedData?.date ? new Date(a.extractedData.date) : new Date(a.createdAt || 0);
            const dateB = b.extractedData?.date ? new Date(b.extractedData.date) : new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
          });
          setDocuments(sorted);
        }
      } catch (err) {
        console.error('Error fetching documents for timeline:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const formatDate = (date?: Date | string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDownloadUrl = (doc: Document) => {
    if (doc.fileUrl) return doc.fileUrl;
    return `/api/documents/download?fileId=${doc._id || doc.id}`;
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-1 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/patient"
          className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition text-[#2ab8d8]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#003893] tracking-tight">Medical Timeline</h1>
          <p className="text-xs text-gray-400 font-semibold">A chronological view of your health record events</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-10 w-10 border-4 border-[#2ab8d8]/30 border-t-[#2ab8d8] rounded-full animate-spin" />
          <p className="text-gray-400 text-xs font-semibold animate-pulse">Loading medical records...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-xl border border-dashed border-gray-200 rounded-3xl p-14 text-center shadow-sm">
          <p className="text-4xl mb-4">📅</p>
          <h3 className="font-bold text-gray-800 text-sm">No timeline events</h3>
          <p className="text-gray-400 text-xs mt-1">Upload records in the dashboard to populate your timeline.</p>
        </div>
      ) : (
        <div className="relative max-w-xl mx-auto">
          {/* Vertical central/left timeline line */}
          <div className="absolute left-8 top-5 bottom-5 w-0.5 bg-gray-200/80" />

          <div className="space-y-6">
            {documents.map((doc) => {
              const visualType = mapDocumentToVisualType(doc.extractedData?.document_type);
              const config = typeConfigs[visualType];
              const eventDate = doc.extractedData?.date || doc.createdAt;

              return (
                <div
                  key={doc._id || doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="relative pl-14 group cursor-pointer transition-all duration-200"
                >
                  {/* Timeline node icon */}
                  <div
                    className={`absolute left-3.5 top-1.5 w-9 h-9 rounded-full flex items-center justify-center z-10 transition border ${config.bgColor} ${config.borderColor} ${config.textColor} group-hover:scale-105 shadow-sm`}
                  >
                    {config.icon}
                  </div>

                  {/* Event Card */}
                  <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-200 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider mb-2 border ${config.bgColor} ${config.borderColor} ${config.textColor}`}
                        >
                          {config.label}
                        </span>
                        <h3 className="text-sm font-bold text-[#003893] group-hover:text-[#2ab8d8] transition">
                          {doc.fileName}
                        </h3>
                      </div>
                      <time className="text-[10px] text-gray-400 font-extrabold sm:text-right whitespace-nowrap">
                        {formatDate(eventDate)}
                      </time>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-gray-500 mt-2">
                      {doc.extractedData?.doctor_name && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">Doctor:</span>
                          <span className="font-semibold text-gray-600">{doc.extractedData.doctor_name}</span>
                        </div>
                      )}
                      {doc.extractedData?.diagnosis && (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-gray-400">Diagnosis:</span>
                          <span className="font-semibold text-gray-600 truncate">{doc.extractedData.diagnosis}</span>
                        </div>
                      )}
                    </div>

                    {/* Medications peek */}
                    {doc.extractedData?.medications && doc.extractedData.medications.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                        {doc.extractedData.medications.map((med, mIdx) => (
                          <span
                            key={mIdx}
                            className="px-2 py-0.5 bg-indigo-50/60 text-indigo-600 rounded-md text-[9px] font-bold border border-indigo-100/50"
                          >
                            💊 {med.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Detail Modal (Apple Glassmorphism Overlay) ─────────── */}
      {selectedDoc && (
        <DocumentDetailModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}
