/**
 * Patient Dashboard matching Heal Link design system
 */
'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DocumentList } from '@/components/DocumentList';
import type { Document } from '@/types/documents';

export default function PatientDashboard() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pendingConfirmation: 0,
  });

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/documents');

        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }

        const data = await response.json();
        const docs = data.documents || [];

        setDocuments(docs);

        const pendingConfirmation = docs.filter((doc: Document) => !doc.isConfirmed).length;
        setStats({
          total: docs.length,
          pendingConfirmation,
        });
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const recentDocuments = documents.slice(0, 3);

  return (
    <div className="space-y-8 pb-20 md:pb-8 max-w-4xl mx-auto px-1">
      {/* 1. Header with Avatar & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="h-12 w-12 rounded-full bg-[#33aed6]/20 border-2 border-[#33aed6] overflow-hidden flex items-center justify-center text-[#003893] font-bold text-lg">
            {session?.user?.name ? session.user.name.charAt(0) : 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#003893] tracking-tight">
              Hi {session?.user?.name || 'Patient'}!
            </h1>
            <p className="text-gray-400 text-xs font-semibold">How are u feeling today?</p>
          </div>
        </div>

        {/* Search Icon */}
        <button className="p-2.5 rounded-full bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition">
          <svg className="h-5 w-5 text-[#33aed6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* 2. Hero Slides Card (News / Vaccine banner) */}
      <div className="bg-[#33aed6] text-white rounded-[32px] p-6 shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-lg">
        {/* Subtle decorative circles */}
        <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -left-10 -bottom-10 w-24 h-24 rounded-full bg-white/10" />

        <div className="relative z-10 space-y-2 max-w-[80%]">
          <span className="bg-white/20 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            Latest Update
          </span>
          <h2 className="text-lg md:text-xl font-extrabold leading-tight">
            BOOK A VACCINE & GET LATEST MEDICAL UPDATES
          </h2>
          <p className="text-white/80 text-xs">
            Extract medical insights from prescriptions, diagnostic reports, and discharge summaries in real time.
          </p>
        </div>
      </div>

      {/* 3. Daily Wellness Section */}
      <div className="bg-[#33aed6] text-white rounded-[32px] p-6 shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-white/95">
              Daily Wellness
            </span>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-white/80">Upcoming appointment</p>
                <p className="text-sm font-bold">Time 10:30 AM, 25/08/2026</p>
              </div>
            </div>
          </div>
          <div className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition cursor-pointer">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Quick Action - Upload Document */}
      <div className="bg-white rounded-3xl p-6 border border-blue-50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-[#003893]">Need to analyze a medical document?</h3>
          <p className="text-xs text-gray-400">Upload prescription or diagnostic files for instant AI extraction.</p>
        </div>
        <Link
          href="/dashboard/patient/upload"
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#003893] hover:bg-[#0b4497] text-white text-xs font-bold rounded-2xl shadow-md transition duration-200 uppercase tracking-wider"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Upload Document
        </Link>
      </div>

      {/* 4. Document History List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#003893] tracking-tight">Recent Medical Documents</h2>
          <Link href="/dashboard/patient/documents" className="text-xs font-semibold text-[#33aed6] hover:underline">
            See all
          </Link>
        </div>

        {recentDocuments.length === 0 && !isLoading ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">No documents uploaded yet.</p>
          </div>
        ) : (
          <DocumentList documents={recentDocuments} isLoading={isLoading} />
        )}
      </div>

      {/* 5. Hospital Recommendation Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#003893] tracking-tight">Hospital Recommendation</h2>
            <p className="text-gray-400 text-xs font-semibold">Top Hospitals</p>
          </div>
          <span className="text-xs font-semibold text-[#33aed6] hover:underline cursor-pointer">
            See all
          </span>
        </div>

        <div className="space-y-4">
          {/* Hospital Card 1 */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
            {/* Hospital Building Illustration */}
            <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-[#33aed6]">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-800 text-sm">Hospital name 1</h4>
                <div className="flex items-center gap-1">
                  <svg className="h-4.5 w-4.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs font-bold text-gray-700">4.9</span>
                  <span className="text-[10px] text-gray-400 font-semibold">( 280 Reviews )</span>
                </div>
              </div>
              <p className="text-xs text-[#33aed6] font-bold">Dentist</p>
            </div>
          </div>

          {/* Hospital Card 2 */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
            <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-[#33aed6]">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-800 text-sm">Hospital name 2</h4>
                <div className="flex items-center gap-1">
                  <svg className="h-4.5 w-4.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs font-bold text-gray-700">4.9</span>
                  <span className="text-[10px] text-gray-400 font-semibold">( 280 Reviews )</span>
                </div>
              </div>
              <p className="text-xs text-[#33aed6] font-bold">Dentist</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating SOS Badge (Bottom Right for emergency simulation) */}
      <button
        onClick={() => alert('SOS emergency call triggered! An ambulance and your physician have been notified.')}
        className="fixed bottom-20 right-6 z-50 h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center shadow-lg transition duration-200 scale-100 hover:scale-110 active:scale-95 uppercase animate-pulse border-4 border-white"
      >
        SOS
      </button>
    </div>
  );
}
