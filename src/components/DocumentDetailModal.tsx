'use client';

import React, { useState } from 'react';
import type { Document } from '@/types/documents';

interface DocumentDetailModalProps {
  document: Document;
  onClose: () => void;
}

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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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

const LANGUAGES = [
  { label: '🇺🇸 English', value: 'English' },
  { label: '🇮🇳 Hindi (हिन्दी)', value: 'Hindi' },
  { label: '🇮🇳 Telugu (తెలుగు)', value: 'Telugu' },
  { label: '🇮🇳 Tamil (தமிழ்)', value: 'Tamil' },
  { label: '🇮🇳 Kannada (ಕನ್ನಡ)', value: 'Kannada' },
  { label: '🇮🇳 Bengali (বাংলা)', value: 'Bengali' },
  { label: '🇪🇸 Spanish (Español)', value: 'Spanish' },
];

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document: doc,
  onClose,
}) => {
  const visualType = mapDocumentToVisualType(doc.extractedData?.document_type);
  const config = typeConfigs[visualType];
  const eventDate = doc.extractedData?.date || doc.createdAt;
  const isPdf = doc.fileType === 'pdf';
  
  const downloadUrl = doc.fileUrl || `/api/documents/download?fileId=${doc._id || doc.id}`;

  const [selectedLang, setSelectedLang] = useState('English');
  const [explanation, setExplanation] = useState<string>('');
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState('');

  const handleExplain = async () => {
    setExplaining(true);
    setExplainError('');
    setExplanation('');
    try {
      const res = await fetch('/api/documents/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc._id || doc.id,
          language: selectedLang,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExplanation(data.explanation);
      } else {
        setExplainError(data.error || 'Failed to explain medical document.');
      }
    } catch (e) {
      console.error(e);
      setExplainError('Network error explaining document.');
    } finally {
      setExplaining(false);
    }
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white/95 backdrop-blur-xl border border-white rounded-3xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl relative">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Modal Title */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider mb-2 border ${config.bgColor} ${config.borderColor} ${config.textColor}`}
              >
                {config.label}
              </span>
              <h2 className="text-lg font-black text-[#003893]">{doc.fileName}</h2>
              <p className="text-[10px] text-gray-400 mt-1">Uploaded on {formatDate(doc.createdAt)}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition border border-gray-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Main details Grid */}
          <div className="bg-[#fcfdfd]/60 border border-gray-100 rounded-2xl p-5 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</h4>
                <p className="text-gray-700 mt-1 font-bold">{formatDate(eventDate)}</p>
              </div>
              {doc.extractedData?.doctor_name && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Doctor</h4>
                  <p className="text-gray-700 mt-1 font-bold">{doc.extractedData.doctor_name}</p>
                </div>
              )}
            </div>

            {doc.extractedData?.diagnosis && (
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Diagnosis</h4>
                <p className="text-gray-700 mt-1 font-semibold">{doc.extractedData.diagnosis}</p>
              </div>
            )}

            {/* Medications list */}
            {doc.extractedData?.medications && doc.extractedData.medications.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Prescribed Medications</h4>
                <div className="space-y-2">
                  {doc.extractedData.medications.map((med, mIdx) => (
                    <div key={mIdx} className="flex justify-between items-center bg-indigo-50/40 border border-indigo-100/50 px-3 py-2 rounded-xl">
                      <span className="font-bold text-indigo-600">💊 {med.name}</span>
                      <span className="text-gray-500 font-medium">{[med.dosage, med.frequency].filter(Boolean).join(' · ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {doc.extractedData?.follow_up_date && (
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Follow-up Date</h4>
                <p className="text-emerald-600 mt-1 font-bold">
                  🗓️ {formatDate(doc.extractedData.follow_up_date)}
                </p>
              </div>
            )}

            {doc.extractedData?.notes && (
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notes</h4>
                <p className="text-gray-600 mt-1 italic">{doc.extractedData.notes}</p>
              </div>
            )}
          </div>

          {/* Explain Simply (Module 6) */}
          <div className="bg-sky-50/40 border border-sky-100/60 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-[#003893] flex items-center gap-1.5">
                  ✨ AI Multilingual Explanation
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Translate & explain jargon in simple terms</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 shadow-sm focus:outline-none"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleExplain}
                  disabled={explaining}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#003893] hover:bg-[#0c4091] rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {explaining ? 'Explaining...' : 'Explain Simply'}
                </button>
              </div>
            </div>

            {explanation && (
              <div className="bg-white border border-sky-100 rounded-xl p-4 text-xs font-medium text-gray-700 leading-relaxed shadow-sm animate-fade-in">
                <p className="font-bold text-[#003893] text-[10px] uppercase tracking-wider mb-1.5">
                  Explanation ({selectedLang}):
                </p>
                {explanation}
              </div>
            )}

            {explainError && (
              <p className="text-xs text-red-500 font-semibold">{explainError}</p>
            )}
          </div>

          {/* Document Preview & Actions */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attachment Preview</h3>
            
            {isPdf ? (
              <div className="border border-gray-100 bg-[#f9fbfd] rounded-2xl p-6 text-center shadow-sm">
                <svg className="h-10 w-10 text-red-500 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A1 1 0 0112 2.586L15.414 6A1 1 0 0116 6.586V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                <p className="text-xs font-bold text-gray-700">PDF Medical Record</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Please download the original file to view.</p>
              </div>
            ) : (
              <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center max-h-[200px] shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={downloadUrl}
                  alt={doc.fileName}
                  className="object-contain max-h-[200px] w-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <a
                href={downloadUrl}
                download={doc.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-[#2ab8d8] hover:bg-[#20a3c2] text-white rounded-2xl font-bold transition text-xs text-center shadow-md shadow-[#2ab8d8]/20"
              >
                Download Original
              </a>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold transition text-xs"
              >
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
