/**
 * MediFlow — Reminders Page
 * Apple glassmorphism style matching dashboard theme
 */
'use client';

import { useEffect, useState } from 'react';
import type { Document } from '@/types/documents';

type Bucket = 'today' | 'week' | 'upcoming';

interface Reminder {
  id: string;
  type: 'followup' | 'medication' | 'appointment';
  title: string;
  subtitle: string;
  date?: Date;
  bucket: Bucket;
  accentColor: string;
}

function getBucket(date: Date): Bucket {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 0) return 'today';
  if (diff <= 7) return 'week';
  return 'upcoming';
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [docsRes, appsRes] = await Promise.all([
          fetch('/api/documents'),
          fetch('/api/appointments'),
        ]);

        const items: Reminder[] = [];

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          const docs: Document[] = docsData.documents || [];
          docs.forEach((doc) => {
            if (doc.extractedData?.follow_up_date) {
              const date = new Date(doc.extractedData.follow_up_date);
              if (date > new Date(Date.now() - 86400000)) {
                items.push({
                  id: `followup-${doc._id}`,
                  type: 'followup',
                  title: `Follow-up: ${doc.extractedData.doctor_name || 'Doctor'}`,
                  subtitle: doc.extractedData.diagnosis ? `Re: ${doc.extractedData.diagnosis}` : doc.fileName,
                  date,
                  bucket: getBucket(date),
                  accentColor: '#10b981',
                });
              }
            }
            doc.extractedData?.medications?.forEach((med, i) => {
              if (med.name) {
                items.push({
                  id: `med-${doc._id}-${i}`,
                  type: 'medication',
                  title: med.name,
                  subtitle: [med.dosage, med.frequency].filter(Boolean).join(' · ') || 'Active medication',
                  bucket: 'today',
                  accentColor: '#6366f1',
                });
              }
            });
          });
        }

        if (appsRes.ok) {
          const appsData = await appsRes.json();
          const appointments = appsData.appointments || [];
          appointments.forEach((app: any) => {
            let date = new Date(app.date);
            if (isNaN(date.getTime())) {
              date = new Date();
            }
            items.push({
              id: `appointment-${app._id || app.id}`,
              type: 'appointment',
              title: `Appointment: ${app.doctorName}`,
              subtitle: `${app.department} Department · Status: ${app.status}`,
              date,
              bucket: getBucket(date),
              accentColor: '#2ab8d8',
            });
          });
        }

        const order: Bucket[] = ['today', 'week', 'upcoming'];
        items.sort((a, b) => {
          const diff = order.indexOf(a.bucket) - order.indexOf(b.bucket);
          if (diff !== 0) return diff;
          if (a.date && b.date) return a.date.getTime() - b.date.getTime();
          return 0;
        });

        setReminders(items);
      } catch (err) {
        console.error('Error fetching reminders:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const buckets: { key: Bucket; label: string; emoji: string }[] = [
    { key: 'today', label: 'Due Today', emoji: '🔴' },
    { key: 'week', label: 'This Week', emoji: '🟡' },
    { key: 'upcoming', label: 'Upcoming', emoji: '🟢' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm">
        <h1 className="text-2xl font-black text-[#003893]">Reminders</h1>
        <p className="text-gray-400 text-sm mt-1">Follow-up dates, appointments, and medication schedules.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/60 rounded-2xl h-16 animate-pulse border border-white/80" />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-xl border border-dashed border-gray-200 rounded-3xl p-14 text-center shadow-sm">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-[#003893] font-bold text-base">All clear!</p>
          <p className="text-gray-400 text-sm mt-1">No upcoming reminders or appointments.</p>
        </div>
      ) : (
        buckets.map(({ key, label, emoji }) => {
          const items = reminders.filter((r) => r.bucket === key);
          if (items.length === 0) return null;
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-3">
                <span>{emoji}</span>
                <h2 className="text-xs font-bold text-[#003893] uppercase tracking-widest">{label}</h2>
                <span className="text-xs font-bold text-gray-400">({items.length})</span>
              </div>
              <div className="space-y-3">
                {items.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:bg-white/80 transition-all duration-200"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${r.accentColor}18` }}
                    >
                      {r.type === 'followup' ? (
                        <svg className="h-5 w-5" style={{ color: r.accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : r.type === 'appointment' ? (
                        <span className="text-base">🩺</span>
                      ) : (
                        <svg className="h-5 w-5" style={{ color: r.accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#003893] text-sm font-semibold truncate">{r.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5 truncate">{r.subtitle}</p>
                    </div>
                    {r.date && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-[#003893]">
                          {r.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-gray-400">{r.date.getFullYear()}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
