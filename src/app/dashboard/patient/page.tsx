/**
 * MediFlow — Patient Dashboard
 * Apple glassmorphism card-based UI on light teal gradient
 */
'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { Document } from '@/types/documents';

export default function PatientDashboard() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/documents');
        if (!res.ok) return;
        const data = await res.json();
        setDocuments(data.documents || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const activeMeds = documents.flatMap((d) => d.extractedData?.medications || []);
  const uniqueMeds = activeMeds.filter((m, i, arr) => arr.findIndex((x) => x.name === m.name) === i);
  const upcoming = documents.filter((d) => {
    if (!d.extractedData?.follow_up_date) return false;
    return new Date(d.extractedData.follow_up_date) > new Date();
  });

  const [mounted, setMounted] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    setMounted(true);
    setDateStr(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    const hr = new Date().getHours();
    setGreeting(hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  const firstName = session?.user?.name?.split(' ')[0] || 'Patient';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── Welcome Header ───────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs font-semibold mb-0.5">
            {mounted ? dateStr : 'Loading...'}
          </p>
          <h1 className="text-2xl font-black text-[#003893] tracking-tight">
            {mounted ? `${greeting}, ${firstName}! 👋` : `Hello, ${firstName}! 👋`}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">How are you feeling today?</p>
        </div>
        {/* Avatar */}
        {!mounted ? (
          <div className="w-12 h-12 rounded-2xl bg-[#2ab8d8] flex items-center justify-center text-white font-black text-lg shadow-md shadow-[#2ab8d8]/30">
            P
          </div>
        ) : session?.user?.image ? (
          <Image
            src={session.user.image}
            alt="Profile"
            width={48}
            height={48}
            className="w-12 h-12 rounded-2xl border-2 border-[#2ab8d8]/30 shadow-md"
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-[#2ab8d8] flex items-center justify-center text-white font-black text-lg shadow-md shadow-[#2ab8d8]/30">
            {firstName.charAt(0)}
          </div>
        )}
      </div>

      {/* ── Stats Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            label: 'Documents',
            value: isLoading ? '—' : documents.length,
            sub: 'Total uploaded',
            color: '#2ab8d8',
            href: '/dashboard/patient/documents',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
          },
          {
            label: 'Medications',
            value: isLoading ? '—' : uniqueMeds.length,
            sub: 'Active',
            color: '#6366f1',
            href: '/dashboard/patient/reminders',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />,
          },
          {
            label: 'Follow-ups',
            value: isLoading ? '—' : upcoming.length,
            sub: 'Upcoming',
            color: '#10b981',
            href: '/dashboard/patient/reminders',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
          },
          {
            label: 'Diagnoses',
            value: isLoading ? '—' : documents.filter(d => d.extractedData?.diagnosis).length,
            sub: 'Recorded',
            color: '#f59e0b',
            href: '/dashboard/patient/documents',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
          },
        ].map((stat, i) => (
          <Link
            key={i}
            href={stat.href}
            className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${stat.color}20` }}
              >
                <svg className="h-4.5 w-4.5" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {stat.icon}
                </svg>
              </div>
              <span className="text-2xl font-black text-[#003893]">{stat.value}</span>
            </div>
            <div>
              <p className="text-[#003893] text-xs font-bold">{stat.label}</p>
              <p className="text-gray-400 text-[10px] mt-0.5">{stat.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Upload CTA Banner ────────────────────────────── */}
      <div className="relative bg-[#2ab8d8] rounded-3xl p-6 overflow-hidden shadow-lg shadow-[#2ab8d8]/20">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -left-3 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <span className="inline-block bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
              AI Analysis
            </span>
            <h2 className="text-lg font-black text-white leading-tight">
              Upload a medical document
            </h2>
            <p className="text-blue-100 text-xs mt-1">
              Gemini AI extracts structured data instantly.
            </p>
          </div>
          <Link
            href="/dashboard/patient/upload"
            className="flex-shrink-0 flex items-center gap-1.5 px-5 py-3 bg-white hover:bg-blue-50 text-[#003893] font-bold rounded-2xl shadow-md transition duration-200 text-xs"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload
          </Link>
        </div>
      </div>

      {/* ── Recent Documents ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#003893]">Recent Documents</h2>
          <Link href="/dashboard/patient/documents" className="text-xs font-semibold text-[#2ab8d8] hover:underline">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/60 rounded-2xl h-16 animate-pulse border border-white/80" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-xl border border-dashed border-gray-200 rounded-3xl p-10 text-center shadow-sm">
            <p className="text-gray-400 text-sm font-medium">No documents yet.</p>
            <p className="text-gray-300 text-xs mt-1">Upload your first prescription to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.slice(0, 4).map((doc) => {
              const typeColor: Record<string, { bg: string; text: string }> = {
                prescription: { bg: '#2ab8d8', text: '#2ab8d8' },
                diagnostic_report: { bg: '#6366f1', text: '#6366f1' },
                discharge_summary: { bg: '#10b981', text: '#10b981' },
                other: { bg: '#9ca3af', text: '#9ca3af' },
              };
              const tc = typeColor[doc.extractedData?.document_type || 'other'];
              return (
                <div key={doc._id} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/80 hover:shadow-sm transition-all duration-200 shadow-sm">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${tc.bg}18` }}>
                    <svg className="h-4 w-4" style={{ color: tc.text }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#003893] text-sm font-semibold truncate">{doc.fileName}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {doc.extractedData?.doctor_name ? `Dr. ${doc.extractedData.doctor_name} · ` : ''}
                      <span className="capitalize">{doc.extractedData?.document_type?.replace('_', ' ') || 'document'}</span>
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-lg capitalize flex-shrink-0"
                    style={{ background: `${tc.bg}18`, color: tc.text }}
                  >
                    {doc.extractedData?.document_type?.replace('_', ' ') || 'doc'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Active Medications ───────────────────────────── */}
      {!isLoading && uniqueMeds.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#003893]">Active Medications</h2>
            <Link href="/dashboard/patient/reminders" className="text-xs font-semibold text-[#2ab8d8] hover:underline">
              Reminders →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {uniqueMeds.slice(0, 4).map((med, i) => (
              <div key={i} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[#003893] text-sm font-semibold truncate">{med.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{med.dosage}{med.frequency ? ` · ${med.frequency}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
