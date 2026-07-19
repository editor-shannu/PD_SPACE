/**
 * Patient documents list page with category filters matching Heal Link rightmost screen
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DocumentList } from '@/components/DocumentList';
import type { Document } from '@/types/documents';
import { DocumentDetailModal } from '@/components/DocumentDetailModal';

type DocTypeFilter = 'all' | 'prescription' | 'diagnostic_report' | 'discharge_summary' | 'other';

export default function MyDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<DocTypeFilter>('all');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/documents');

        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }

        const data = await response.json();
        setDocuments(data.documents || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const filteredDocuments = documents.filter((doc) => {
    if (activeFilter === 'all') return true;
    return doc.extractedData?.document_type === activeFilter;
  });

  const filterTabs: { label: string; value: DocTypeFilter }[] = [
    { label: 'All Files', value: 'all' },
    { label: 'Prescriptions', value: 'prescription' },
    { label: 'Diagnostic Reports', value: 'diagnostic_report' },
    { label: 'Discharge Summaries', value: 'discharge_summary' },
    { label: 'Others', value: 'other' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-1 pb-20 md:pb-8">
      {/* Back button and Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/patient"
          className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition text-[#33aed6]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#003893] tracking-tight">My Medical Records</h1>
          <p className="text-xs text-gray-400 font-semibold">Browse and filter your processed health vaults</p>
        </div>
      </div>

      {/* Filter Tabs matching "Private, Government, Overall" pills in mockup */}
      <div className="flex flex-wrap gap-2 py-2">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 border ${
                isActive
                  ? 'bg-[#003893] text-white border-[#003893] shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Document List Container */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        {filteredDocuments.length === 0 && !isLoading ? (
          <div className="text-center py-12 space-y-3">
            <div className="mx-auto h-12 w-12 bg-sky-50 rounded-full flex items-center justify-center text-[#33aed6]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-800 text-sm">No documents found</h3>
            <p className="text-xs text-gray-400">
              {activeFilter === 'all'
                ? 'Upload your first medical document to get started.'
                : `No files found matching the selected category.`}
            </p>
          </div>
        ) : (
          <DocumentList
            documents={filteredDocuments}
            isLoading={isLoading}
            onViewDetails={(doc) => setSelectedDoc(doc)}
          />
        )}
      </div>

      {selectedDoc && (
        <DocumentDetailModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}
