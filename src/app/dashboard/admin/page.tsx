'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface StatData {
  missedFollowupRate: number;
  patientComplianceScore: number;
  averageTreatmentTimeline: number;
  bottlenecks: { department: string; appointments: number }[];
  geminiInsight: string;
  totalPatients: number;
  totalDocuments: number;
  totalAppointments: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<StatData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchStats = async (seed = false) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const url = seed ? '/api/admin/stats?seed=true' : '/api/admin/stats';
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Access Denied: You do not have administrator privileges.');
        }
        throw new Error('Failed to fetch admin stats.');
      }
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.error || 'Failed to fetch admin stats.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status]);

  const handleSeedData = async () => {
    setIsSeeding(true);
    await fetchStats(true);
    setIsSeeding(false);
  };

  // 1. Loading State
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-10 w-10 border-4 border-[#2ab8d8]/30 border-t-[#2ab8d8] rounded-full animate-spin" />
        <p className="text-gray-400 text-xs font-semibold animate-pulse">Authenticating Admin Session...</p>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (status === 'unauthenticated') {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-8 text-center shadow-sm">
        <span className="text-4xl">🔐</span>
        <h2 className="text-lg font-bold text-[#003893] mt-4">Admin Access Required</h2>
        <p className="text-gray-400 text-xs mt-2 mb-6">Please sign in with an administrator account to view clinical analytics.</p>
        <Link
          href="/auth/login"
          className="inline-block px-6 py-2.5 bg-[#003893] hover:bg-[#082f73] text-white rounded-xl text-xs font-bold transition shadow"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // 3. Forbidden / Wrong Role State
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'admin';

  if (!isAdmin || errorMessage.includes('Access Denied')) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-8 text-center shadow-sm">
        <span className="text-4xl text-red-500">🚫</span>
        <h2 className="text-lg font-bold text-red-600 mt-4">Access Denied</h2>
        <p className="text-gray-400 text-xs mt-2 mb-4">
          You are signed in as <span className="font-semibold text-gray-700">{session?.user?.email}</span> (Role: <span className="capitalize text-gray-700">{userRole || 'patient'}</span>).
        </p>
        <p className="text-gray-400 text-xs mb-6">Only users with the admin role in MongoDB are authorized to view this dashboard.</p>
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard/patient"
            className="w-full py-2 bg-[#2ab8d8] hover:bg-[#1fb1d1] text-white rounded-xl text-xs font-bold transition"
          >
            Go to Patient Dashboard
          </Link>
          <Link
            href="/auth/login"
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition border border-gray-200"
          >
            Sign in as another User
          </Link>
        </div>
      </div>
    );
  }

  // 4. Loading Data State
  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-10 w-10 border-4 border-[#2ab8d8]/30 border-t-[#2ab8d8] rounded-full animate-spin" />
        <p className="text-gray-400 text-xs font-semibold animate-pulse">Analyzing clinical records & generating insights...</p>
      </div>
    );
  }

  // Fallback for empty stats
  const finalStats: StatData = stats || {
    missedFollowupRate: 0,
    patientComplianceScore: 0,
    averageTreatmentTimeline: 0,
    bottlenecks: [],
    geminiInsight: 'No insight available.',
    totalPatients: 0,
    totalDocuments: 0,
    totalAppointments: 0
  };

  // Pie chart data for compliance
  const compliancePieData = [
    { name: 'On-Time', value: finalStats.patientComplianceScore },
    { name: 'Late / Missed', value: 100 - finalStats.patientComplianceScore }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 md:pb-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-400 text-xs font-semibold mb-0.5">ADMINISTRATIVE PORTAL</p>
          <h1 className="text-2xl font-black text-[#003893] tracking-tight">Clinical Operations Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Real-time patient compliance, bottlenecks, and timeline analytics.</p>
        </div>

        <button
          onClick={handleSeedData}
          disabled={isSeeding || isLoading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2ab8d8] to-[#003893] hover:from-[#1fb1d1] hover:to-[#082f73] text-white rounded-xl text-xs font-bold transition shadow disabled:opacity-50"
        >
          {isSeeding ? (
            <>
              <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Seeding records...
            </>
          ) : (
            <>
              <span>🌱</span> Seed Rich Analytics Data
            </>
          )}
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Missed Follow-up Rate',
            value: `${finalStats.missedFollowupRate.toFixed(1)}%`,
            sub: 'Of total past checkups',
            color: '#ef4444',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            ),
          },
          {
            label: 'Follow-up Compliance',
            value: `${finalStats.patientComplianceScore.toFixed(1)}%`,
            sub: 'Completed on-time',
            color: '#10b981',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
          },
          {
            label: 'Avg Treatment Timeline',
            value: `${finalStats.averageTreatmentTimeline.toFixed(1)} Days`,
            sub: 'Diagnosis to resolution',
            color: '#6366f1',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
          },
          {
            label: 'Hospital Performance',
            value: `${finalStats.totalPatients} Patients`,
            sub: `${finalStats.totalAppointments} Appts · ${finalStats.totalDocuments} Files`,
            color: '#f59e0b',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            ),
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div
                className="w-8.5 h-8.5 rounded-xl flex items-center justify-center"
                style={{ background: `${stat.color}15` }}
              >
                <svg className="h-4.5 w-4.5" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {stat.icon}
                </svg>
              </div>
              <span className="text-lg font-black text-[#003893] tracking-tight">{stat.value}</span>
            </div>
            <div>
              <p className="text-[#003893] text-xs font-bold leading-tight">{stat.label}</p>
              <p className="text-gray-400 text-[10px] mt-0.5 leading-none">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gemini AI Performance Insight Card */}
      {finalStats.geminiInsight && (
        <div className="bg-gradient-to-r from-white/70 to-indigo-50/50 backdrop-blur-xl border border-white/90 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <h3 className="text-xs font-bold text-[#003893] uppercase tracking-widest leading-none">Clinical Operations Insight</h3>
              <p className="text-[9px] text-gray-400 font-semibold leading-none mt-0.5">Auto-generated performance analysis by Gemini</p>
            </div>
          </div>
          <p className="text-xs text-[#003893]/90 leading-relaxed font-semibold">
            {finalStats.geminiInsight}
          </p>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left/Middle: Bar Chart of Bottlenecks (Department volume) */}
        <div className="md:col-span-2 bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-[#003893] uppercase tracking-widest">Appointment Bottlenecks</h3>
              <p className="text-[10px] text-gray-400 font-semibold leading-none mt-0.5">Total volume of appointments per department</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {finalStats.bottlenecks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                No appointment data available. Seed data to view.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={finalStats.bottlenecks}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="department"
                    tick={{ fill: '#003893', fontSize: 9, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    }}
                    labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#003893' }}
                    itemStyle={{ fontSize: '10px', color: '#6366f1' }}
                  />
                  <Bar dataKey="appointments" radius={[8, 8, 0, 0]}>
                    {finalStats.bottlenecks.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#003893' : index % 2 === 0 ? '#2ab8d8' : '#6366f1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Pie Chart for Compliance */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-sm flex flex-col">
          <div>
            <h3 className="text-xs font-bold text-[#003893] uppercase tracking-widest">Compliance Distribution</h3>
            <p className="text-[10px] text-gray-400 font-semibold leading-none mt-0.5">Ratio of on-time to missed/late follow-ups</p>
          </div>

          <div className="h-44 w-full relative mt-4">
            {finalStats.patientComplianceScore === 0 && finalStats.missedFollowupRate === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                No past follow-up data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={compliancePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                    }}
                    itemStyle={{ fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute top-[49%] left-[50%] -translate-x-[50%] -translate-y-[50%] text-center">
              <span className="text-base font-black text-[#003893]">
                {finalStats.patientComplianceScore.toFixed(0)}%
              </span>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wide">Compliant</p>
            </div>
          </div>

          <div className="mt-auto space-y-1.5 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span>On-time Follow-up</span>
              </div>
              <span className="text-[#003893]">{finalStats.patientComplianceScore.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <span>Missed / Late</span>
              </div>
              <span className="text-[#003893]">{(100 - finalStats.patientComplianceScore).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
