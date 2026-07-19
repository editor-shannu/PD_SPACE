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

interface Recommendation {
  recommended_department: string;
  urgency_level: 'routine' | 'soon' | 'urgent';
  reasoning: string;
}

export default function PatientDashboard() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mini Triage States
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [triageError, setTriageError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [docsRes, appsRes] = await Promise.all([
          fetch('/api/documents'),
          fetch('/api/appointments'),
        ]);

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments(docsData.documents || []);
        }

        if (appsRes.ok) {
          const appsData = await appsRes.json();
          setAppointments(appsData.appointments || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const activeMeds = documents.flatMap((d) => d.extractedData?.medications || []);
  const uniqueMeds = activeMeds.filter((m, i, arr) => arr.findIndex((x) => x.name === m.name) === i);
  const upcomingFollowups = documents.filter((d) => {
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

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setIsAnalyzing(true);
    setTriageError('');
    setRecommendation(null);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
      });

      const data = await res.json();
      if (data.success && data.recommendation) {
        setRecommendation(data.recommendation);
      } else {
        setTriageError(data.error || 'Failed to analyze symptoms.');
      }
    } catch (err) {
      setTriageError('Error communicating with triage service.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const firstName = session?.user?.name?.split(' ')[0] || 'Patient';

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20 md:pb-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs font-semibold mb-0.5">
            {mounted ? dateStr : 'Loading...'}
          </p>
          <h1 className="text-2xl font-black text-[#003893] tracking-tight">
            {mounted ? `${greeting}, ${firstName}! 👋` : `Hello, ${firstName}! 👋`}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">How is your health today?</p>
        </div>
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

      {/* Grid Layout: Main info and Sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Quick Actions & Primary Widgets */}
        <div className="md:col-span-8 space-y-6">
          {/* Quick Actions Grid */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-[#003893] uppercase tracking-widest mb-3">Quick Navigation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Upload Files', href: '/dashboard/patient/upload', icon: '📤', color: 'bg-emerald-50 text-emerald-600' },
                { name: 'Timeline', href: '/dashboard/patient/timeline', icon: '📅', color: 'bg-indigo-50 text-indigo-600' },
                { name: 'Reminders', href: '/dashboard/patient/reminders', icon: '⏰', color: 'bg-amber-50 text-amber-500' },
                { name: 'Locate Clinics', href: '/dashboard/patient/locator', icon: '📍', color: 'bg-sky-50 text-sky-500' },
              ].map((act, i) => (
                <Link
                  key={i}
                  href={act.href}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all hover:-translate-y-0.5 shadow-sm text-center"
                >
                  <span className="text-2xl mb-1.5">{act.icon}</span>
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-wide leading-tight">{act.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'Documents',
                value: isLoading ? '—' : documents.length,
                sub: 'Total records',
                color: '#2ab8d8',
                href: '/dashboard/patient/documents',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
              },
              {
                label: 'Medications',
                value: isLoading ? '—' : uniqueMeds.length,
                sub: 'Active prescriptions',
                color: '#6366f1',
                href: '/dashboard/patient/reminders',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />,
              },
              {
                label: 'Follow-ups',
                value: isLoading ? '—' : upcomingFollowups.length,
                sub: 'Upcoming checkups',
                color: '#10b981',
                href: '/dashboard/patient/reminders',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
              },
              {
                label: 'Diagnoses',
                value: isLoading ? '—' : documents.filter(d => d.extractedData?.diagnosis).length,
                sub: 'Extracted history',
                color: '#f59e0b',
                href: '/dashboard/patient/documents',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
              },
            ].map((stat, i) => (
              <Link
                key={i}
                href={stat.href}
                className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-4 flex flex-col gap-2.5 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${stat.color}15` }}
                  >
                    <svg className="h-4 w-4" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {stat.icon}
                    </svg>
                  </div>
                  <span className="text-xl font-black text-[#003893]">{stat.value}</span>
                </div>
                <div>
                  <p className="text-[#003893] text-[11px] font-bold">{stat.label}</p>
                  <p className="text-gray-400 text-[9px] mt-0.5 leading-tight">{stat.sub}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Recent Medical Documents */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm font-bold text-[#003893] uppercase tracking-wider">Recent Health Files</h2>
              <Link href="/dashboard/patient/documents" className="text-xs font-bold text-[#2ab8d8] hover:underline">
                View all Documents →
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white/60 rounded-2xl h-16 animate-pulse border border-white/80" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-white/60 border border-dashed border-gray-200 rounded-3xl p-8 text-center shadow-sm">
                <p className="text-gray-400 text-xs font-semibold">No medical documents yet.</p>
                <Link href="/dashboard/patient/upload" className="text-xs font-bold text-[#2ab8d8] hover:underline mt-1 inline-block">
                  Upload prescription/report
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.slice(0, 3).map((doc) => {
                  const typeColor: Record<string, { bg: string; text: string }> = {
                    prescription: { bg: '#2ab8d8', text: '#2ab8d8' },
                    diagnostic_report: { bg: '#6366f1', text: '#6366f1' },
                    discharge_summary: { bg: '#10b981', text: '#10b981' },
                    other: { bg: '#9ca3af', text: '#9ca3af' },
                  };
                  const tc = typeColor[doc.extractedData?.document_type || 'other'];
                  return (
                    <Link
                      key={doc._id}
                      href="/dashboard/patient/documents"
                      className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/80 hover:shadow-sm transition-all duration-200 shadow-sm block"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${tc.bg}15` }}>
                        <svg className="h-5 w-5" style={{ color: tc.text }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#003893] text-sm font-semibold truncate">{doc.fileName}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {doc.extractedData?.doctor_name ? `Dr. ${doc.extractedData.doctor_name.replace(/^(dr\.?\s*)/i, '')} · ` : ''}
                          <span className="capitalize">{doc.extractedData?.document_type?.replace('_', ' ') || 'Document'}</span>
                        </p>
                      </div>
                      <span
                        className="text-[9px] font-black px-2 py-0.5 rounded-lg capitalize flex-shrink-0"
                        style={{ background: `${tc.bg}15`, color: tc.text }}
                      >
                        {doc.extractedData?.document_type?.replace('_', ' ') || 'doc'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Triage Widget & Upcoming Schedule */}
        <div className="md:col-span-4 space-y-6">
          {/* AI Symptom Triage Widget */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <h3 className="text-xs font-bold text-[#003893] uppercase tracking-widest">AI Symptom Triage</h3>
                <p className="text-[10px] text-gray-400 font-semibold leading-none mt-0.5">Symptom analysis & specialist suggestion</p>
              </div>
            </div>

            <form onSubmit={handleTriageSubmit} className="space-y-3">
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Type symptoms (e.g. skin rash, dizziness...)"
                className="w-full h-20 p-3 text-xs text-[#003893] placeholder-gray-400 bg-white/80 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ab8d8] resize-none"
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={isAnalyzing || !symptoms.trim()}
                className="w-full py-2 bg-[#003893] hover:bg-[#082f73] text-white rounded-xl text-xs font-bold transition shadow disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? 'Analyzing...' : 'Get Suggestion'}
              </button>
            </form>

            {triageError && (
              <p className="text-[10px] font-semibold text-red-500 bg-red-50/50 p-2 rounded-lg border border-red-100">
                ⚠️ {triageError}
              </p>
            )}

            {recommendation && (
              <div className="bg-[#2ab8d8]/5 border border-[#2ab8d8]/10 rounded-xl p-3.5 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#003893]">{recommendation.recommended_department}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase bg-amber-500/10 text-amber-500">
                    {recommendation.urgency_level}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                  {recommendation.reasoning}
                </p>
                <Link
                  href={`/dashboard/patient/booking?facility=${encodeURIComponent(recommendation.recommended_department)}&type=clinic&symptoms=${encodeURIComponent(symptoms)}&urgency=${encodeURIComponent(recommendation.urgency_level)}&reasoning=${encodeURIComponent(recommendation.reasoning)}`}
                  className="block w-full py-1.5 text-center bg-[#2ab8d8] hover:bg-[#1fb1d1] text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition"
                >
                  Book Specialist
                </Link>
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#003893] uppercase tracking-wider">Appointments</h2>
              <Link href="/dashboard/patient/booking" className="text-[10px] font-bold text-[#2ab8d8] hover:underline">
                Manage
              </Link>
            </div>

            {isLoading ? (
              <div className="bg-white/60 rounded-2xl h-16 animate-pulse border border-white/80" />
            ) : appointments.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-xl border border-dashed border-gray-200 rounded-3xl p-5 text-center shadow-sm">
                <p className="text-[10px] text-gray-400 font-semibold">No appointments scheduled.</p>
                <Link href="/dashboard/patient/booking" className="text-[10px] font-bold text-[#2ab8d8] hover:underline mt-1 inline-block">
                  Book appointment
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 2).map((app) => (
                  <div key={app._id || app.id} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/80 transition-all duration-200 shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base flex-shrink-0">🩺</span>
                      <div className="min-w-0">
                        <p className="text-[#003893] text-xs font-bold truncate">{app.doctorName}</p>
                        <p className="text-[10px] text-gray-400 truncate">{app.department} Dept</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-100/60 mt-3 pt-2.5 text-[10px] font-bold text-gray-500">
                      <span>🗓️ {app.date}</span>
                      <span>🕒 {app.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Medications list */}
          {uniqueMeds.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-[#003893] uppercase tracking-wider">Active Medications</h2>
                <Link href="/dashboard/patient/reminders" className="text-[10px] font-bold text-[#2ab8d8] hover:underline">
                  Schedules
                </Link>
              </div>
              <div className="space-y-2">
                {uniqueMeds.slice(0, 3).map((med, i) => (
                  <div key={i} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
                    <span className="text-base flex-shrink-0">💊</span>
                    <div className="min-w-0">
                      <p className="text-[#003893] text-xs font-bold truncate leading-tight">{med.name}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5 truncate">{med.dosage}{med.frequency ? ` · ${med.frequency}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
