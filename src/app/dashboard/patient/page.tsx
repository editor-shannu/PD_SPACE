/**
 * MediFlow — Patient Dashboard
 * Aggregates: recent docs, upcoming appointments, active medications, reminders
 */
'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Document } from '@/types/documents';

interface StatCard {
  label: string;
  value: string | number;
  sub: string;
  color: string;
  icon: React.ReactNode;
  href: string;
}

export default function PatientDashboard() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/documents');
        if (!res.ok) return;
        const data = await res.json();
        setDocuments(data.documents || []);
      } catch (e) {
        console.error('Failed to fetch documents:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  const consultations = documents.filter(
    (d) => d.extractedData?.document_type === 'diagnostic_report' || d.extractedData?.document_type === 'discharge_summary'
  );
  const activeMeds = documents.flatMap((d) => d.extractedData?.medications || []);
  const uniqueMeds = activeMeds.filter(
    (m, i, arr) => arr.findIndex((x) => x.name === m.name) === i
  );
  const upcoming = documents.filter((d) => {
    if (!d.extractedData?.follow_up_date) return false;
    return new Date(d.extractedData.follow_up_date) > new Date();
  });

  const firstName = session?.user?.name?.split(' ')[0] || 'Patient';
  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || 'M';

  const stats: StatCard[] = [
    {
      label: 'Total Documents',
      value: isLoading ? '—' : documents.length,
      sub: 'All uploaded records',
      color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      ),
      href: '/dashboard/patient/documents',
    },
    {
      label: 'Active Medications',
      value: isLoading ? '—' : uniqueMeds.length,
      sub: 'From recent prescriptions',
      color: 'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      ),
      href: '/dashboard/patient/reminders',
    },
    {
      label: 'Follow-ups',
      value: isLoading ? '—' : upcoming.length,
      sub: 'Upcoming appointments',
      color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      ),
      href: '/dashboard/patient/reminders',
    },
    {
      label: 'Consultations',
      value: isLoading ? '—' : consultations.length,
      sub: 'Recorded visits',
      color: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      ),
      href: '/dashboard/patient/documents',
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-3xl font-black text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#a78bfa] bg-clip-text text-transparent">
              {firstName}
            </span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here's your health overview for today.</p>
        </div>
        {/* Avatar */}
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20">
          {userInitial}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Link
            key={i}
            href={stat.href}
            className={`bg-gradient-to-br ${stat.color} border rounded-2xl p-5 flex flex-col gap-3 transition hover:scale-[1.02] duration-200`}
          >
            <div className="flex items-center justify-between">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {stat.icon}
              </svg>
              <span className="text-2xl font-black text-white">{stat.value}</span>
            </div>
            <div>
              <p className="text-white text-xs font-bold">{stat.label}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">{stat.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Upload Banner */}
      <div className="relative bg-gradient-to-r from-[#3b82f6] to-[#6366f1] rounded-3xl p-6 overflow-hidden shadow-xl shadow-blue-500/20">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -left-4 -bottom-6 w-28 h-28 rounded-full bg-white/5" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="inline-block bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              AI Document Analysis
            </span>
            <h2 className="text-xl font-black text-white leading-tight">
              Upload a prescription or report
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Gemini AI extracts structured medical data instantly.
            </p>
          </div>
          <Link
            href="/dashboard/patient/upload"
            className="flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-white hover:bg-blue-50 text-[#3b82f6] font-bold rounded-2xl shadow-md transition duration-200 text-sm"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Now
          </Link>
        </div>
      </div>

      {/* Recent Documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Recent Documents</h2>
          <Link href="/dashboard/patient/documents" className="text-xs font-semibold text-blue-400 hover:underline">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 rounded-2xl h-16 animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white/5 border border-white/10 border-dashed rounded-2xl p-10 text-center">
            <svg className="h-10 w-10 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-sm font-medium">No documents yet.</p>
            <p className="text-gray-600 text-xs mt-1">Upload your first prescription to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.slice(0, 4).map((doc) => {
              const typeColors: Record<string, string> = {
                prescription: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                diagnostic_report: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                discharge_summary: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                other: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
              };
              const typeColor = typeColors[doc.extractedData?.document_type || 'other'];
              return (
                <div key={doc._id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/8 transition">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${typeColor} text-xs font-bold uppercase flex-shrink-0`}>
                    {doc.fileType === 'pdf' ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{doc.fileName}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {doc.extractedData?.doctor_name && `Dr. ${doc.extractedData.doctor_name} · `}
                      {doc.extractedData?.document_type?.replace('_', ' ')}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border capitalize ${typeColor}`}>
                    {doc.extractedData?.document_type?.replace('_', ' ') || 'doc'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Medications */}
      {!isLoading && uniqueMeds.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Active Medications</h2>
            <Link href="/dashboard/patient/reminders" className="text-xs font-semibold text-blue-400 hover:underline">
              Reminders →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {uniqueMeds.slice(0, 4).map((med, i) => (
              <div key={i} className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{med.name}</p>
                  <p className="text-violet-300 text-xs mt-0.5">
                    {med.dosage}{med.frequency ? ` · ${med.frequency}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
