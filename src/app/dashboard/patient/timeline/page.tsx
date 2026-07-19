'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Document } from '@/types/documents';

type VisualType = 'consultation' | 'medication' | 'test' | 'treatment';

interface VisualConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const typeConfigs: Record<VisualType, VisualConfig> = {
  medication: {
    label: 'Medication',
    color: '#a5b4fc', // indigo-300
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  test: {
    label: 'Test / Lab Report',
    color: '#67e8f9', // cyan-300
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  treatment: {
    label: 'Treatment / Discharge',
    color: '#6ee7b7', // emerald-300
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  consultation: {
    label: 'Consultation',
    color: '#fde047', // yellow-300
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
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
    <div className="min-h-screen bg-[#070b19] text-gray-100 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
      {/* Aurora glow effect background */}
      <div className="absolute top-0 right-0 -mt-24 -mr-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-80 h-80 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-slate-800/60 relative z-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Medical Timeline
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            A chronological view of your consultations, medications, tests, and treatments.
          </p>
        </div>
        <Link
          href="/dashboard/patient"
          className="self-start md:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition text-xs border border-slate-700"
        >
          ← Dashboard
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-10 w-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-semibold animate-pulse">Loading medical records...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30 backdrop-blur-sm">
          <div className="h-12 w-12 mx-auto bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-4">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">No timeline events</h3>
          <p className="text-gray-400 text-xs mt-1 max-w-xs mx-auto">
            Upload medical records in the dashboard to populate your timeline.
          </p>
        </div>
      ) : (
        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Vertical central/left timeline line */}
          <div className="absolute left-8 top-5 bottom-5 w-0.5 bg-gradient-to-b from-indigo-500/50 via-slate-800 to-indigo-500/20" />

          <div className="space-y-8">
            {documents.map((doc, idx) => {
              const visualType = mapDocumentToVisualType(doc.extractedData?.document_type);
              const config = typeConfigs[visualType];
              const eventDate = doc.extractedData?.date || doc.createdAt;

              return (
                <div
                  key={doc._id || doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="relative pl-16 group cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
                >
                  {/* Timeline node icon */}
                  <div
                    className={`absolute left-3.5 top-1.5 w-9.5 h-9.5 rounded-full flex items-center justify-center z-10 transition border ${config.bgColor} ${config.borderColor} group-hover:scale-110 shadow-lg`}
                    style={{ color: config.color, width: '38px', height: '38px' }}
                  >
                    {config.icon}
                  </div>

                  {/* Event Card */}
                  <div className="bg-[#0b1329]/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-indigo-500/40 hover:bg-[#0f1a38] transition-all duration-300 relative overflow-hidden backdrop-blur-md">
                    {/* Glowing highlight indicator */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: config.color }}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                      <div>
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-2"
                          style={{ color: config.color, backgroundColor: `${config.color}15` }}
                        >
                          {config.label}
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-200 transition">
                          {doc.fileName}
                        </h3>
                      </div>
                      <time className="text-xs text-indigo-300 font-bold sm:text-right whitespace-nowrap">
                        {formatDate(eventDate)}
                      </time>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-400 mt-2">
                      {doc.extractedData?.doctor_name && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 font-semibold">Doctor:</span>
                          <span className="text-gray-300">{doc.extractedData.doctor_name}</span>
                        </div>
                      )}
                      {doc.extractedData?.diagnosis && (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-gray-500 font-semibold">Diagnosis:</span>
                          <span className="text-gray-300 truncate">{doc.extractedData.diagnosis}</span>
                        </div>
                      )}
                    </div>

                    {/* Medications peek */}
                    {doc.extractedData?.medications && doc.extractedData.medications.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap gap-2">
                        {doc.extractedData.medications.map((med, mIdx) => (
                          <span
                            key={mIdx}
                            className="px-2 py-1 bg-indigo-500/5 text-indigo-300 rounded-md text-[10px] font-semibold border border-indigo-500/10"
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
      {selectedDoc && (() => {
        const visualType = mapDocumentToVisualType(selectedDoc.extractedData?.document_type);
        const config = typeConfigs[visualType];
        const eventDate = selectedDoc.extractedData?.date || selectedDoc.createdAt;
        const isPdf = selectedDoc.fileType === 'pdf';
        const downloadUrl = getDownloadUrl(selectedDoc);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-md transition-opacity">
            <div className="bg-[#0b1329] border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative">
              
              {/* Colored header accent */}
              <div
                className="h-2 w-full sticky top-0"
                style={{ backgroundColor: config.color }}
              />

              <div className="p-6 sm:p-8 space-y-6">
                {/* Modal Title */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: config.color, backgroundColor: `${config.color}15` }}
                    >
                      {config.label}
                    </span>
                    <h2 className="text-xl font-black text-white">{selectedDoc.fileName}</h2>
                    <p className="text-xs text-gray-400 mt-1">Uploaded on {formatDate(selectedDoc.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-1 bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white rounded-lg transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Main details Grid */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</h4>
                      <p className="text-gray-200 mt-1 font-semibold">{formatDate(eventDate)}</p>
                    </div>
                    {selectedDoc.extractedData?.doctor_name && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Doctor</h4>
                        <p className="text-gray-200 mt-1 font-semibold">{selectedDoc.extractedData.doctor_name}</p>
                      </div>
                    )}
                  </div>

                  {selectedDoc.extractedData?.diagnosis && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Diagnosis</h4>
                      <p className="text-gray-200 mt-1">{selectedDoc.extractedData.diagnosis}</p>
                    </div>
                  )}

                  {/* Medications list */}
                  {selectedDoc.extractedData?.medications && selectedDoc.extractedData.medications.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Prescribed Medications</h4>
                      <div className="space-y-2">
                        {selectedDoc.extractedData.medications.map((med, mIdx) => (
                          <div key={mIdx} className="flex justify-between items-center bg-indigo-500/5 border border-indigo-500/10 px-3 py-2 rounded-xl text-xs">
                            <span className="font-bold text-indigo-300">💊 {med.name}</span>
                            <span className="text-gray-400">{[med.dosage, med.frequency].filter(Boolean).join(' · ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDoc.extractedData?.follow_up_date && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Follow-up Date</h4>
                      <p className="text-emerald-400 mt-1 font-semibold">
                        🗓️ {formatDate(selectedDoc.extractedData.follow_up_date)}
                      </p>
                    </div>
                  )}

                  {selectedDoc.extractedData?.notes && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</h4>
                      <p className="text-gray-300 mt-1 text-xs italic">{selectedDoc.extractedData.notes}</p>
                    </div>
                  )}
                </div>

                {/* Document Preview & Actions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Attachment Preview</h3>
                  
                  {isPdf ? (
                    <div className="border border-slate-800 bg-[#070b19] rounded-2xl p-6 text-center">
                      <svg className="h-10 w-10 text-red-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A1 1 0 0112 2.586L15.414 6A1 1 0 0116 6.586V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-semibold text-white">PDF Medical Record</p>
                      <p className="text-xs text-gray-400 mt-0.5">Preview is not available inside pdf container, please download the file.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[300px] relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={downloadUrl}
                        alt={selectedDoc.fileName}
                        className="object-contain max-h-[300px] w-auto"
                        onError={(e) => {
                          // Fallback in case of broken link
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="flex gap-4 pt-2">
                    <a
                      href={downloadUrl}
                      download={selectedDoc.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition text-xs text-center shadow-lg shadow-indigo-600/20"
                    >
                      Download Original File
                    </a>
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition text-xs"
                    >
                      Close
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
