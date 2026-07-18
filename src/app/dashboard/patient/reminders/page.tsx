/**
 * MediFlow — Reminders Page (Step 5)
 * Surfaces upcoming follow-up dates and medication frequency from stored documents
 */
'use client';

import { useEffect, useState } from 'react';
import type { Document } from '@/types/documents';

type Bucket = 'today' | 'week' | 'upcoming';

interface Reminder {
  id: string;
  type: 'followup' | 'medication';
  title: string;
  subtitle: string;
  date?: Date;
  bucket: Bucket;
  color: string;
}

function getBucket(date: Date): Bucket {
  const now = new Date();
  const diff = (date.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24);
  if (diff <= 0) return 'today';
  if (diff <= 7) return 'week';
  return 'upcoming';
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/documents');
        if (!res.ok) return;
        const data = await res.json();
        const docs: Document[] = data.documents || [];

        const items: Reminder[] = [];

        docs.forEach((doc) => {
          // Follow-up reminders
          if (doc.extractedData?.follow_up_date) {
            const date = new Date(doc.extractedData.follow_up_date);
            if (date > new Date(Date.now() - 86400000)) {
              items.push({
                id: `followup-${doc._id}`,
                type: 'followup',
                title: `Follow-up: ${doc.extractedData.doctor_name || 'Doctor'}`,
                subtitle: doc.extractedData.diagnosis
                  ? `Re: ${doc.extractedData.diagnosis}`
                  : doc.fileName,
                date,
                bucket: getBucket(date),
                color: 'emerald',
              });
            }
          }

          // Medication reminders
          doc.extractedData?.medications?.forEach((med, i) => {
            if (med.frequency) {
              items.push({
                id: `med-${doc._id}-${i}`,
                type: 'medication',
                title: med.name,
                subtitle: `${med.dosage || ''} · ${med.frequency}`.trim().replace(/^·\s*/, ''),
                bucket: 'today',
                color: 'violet',
              });
            }
          });
        });

        // Sort: today first, then week, then upcoming
        const order: Bucket[] = ['today', 'week', 'upcoming'];
        items.sort((a, b) => {
          const oa = order.indexOf(a.bucket);
          const ob = order.indexOf(b.bucket);
          if (oa !== ob) return oa - ob;
          if (a.date && b.date) return a.date.getTime() - b.date.getTime();
          return 0;
        });

        setReminders(items);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const buckets: { key: Bucket; label: string; icon: string }[] = [
    { key: 'today', label: 'Due Today', icon: '🔴' },
    { key: 'week', label: 'This Week', icon: '🟡' },
    { key: 'upcoming', label: 'Upcoming', icon: '🟢' },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Reminders</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upcoming follow-ups and active medication schedules.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/5 rounded-2xl h-16 animate-pulse" />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <div className="bg-white/5 border border-white/10 border-dashed rounded-2xl p-12 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-white font-semibold">All clear!</p>
          <p className="text-gray-500 text-sm mt-1">No upcoming reminders.</p>
        </div>
      ) : (
        buckets.map(({ key, label, icon }) => {
          const items = reminders.filter((r) => r.bucket === key);
          if (items.length === 0) return null;
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-3">
                <span>{icon}</span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{label}</h2>
                <span className="text-xs text-gray-500 font-semibold">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border ${colorMap[r.color]}`}
                  >
                    <div className="flex-shrink-0">
                      {r.type === 'followup' ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{r.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{r.subtitle}</p>
                    </div>
                    {r.date && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-white">
                          {r.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-gray-500">{r.date.getFullYear()}</p>
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
