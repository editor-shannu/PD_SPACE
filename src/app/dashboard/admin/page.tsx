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
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersSearch, setUsersSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [usersError, setUsersError] = useState('');

  // Hospital Applications State
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [hospitalsError, setHospitalsError] = useState('');
  const [updatingHospId, setUpdatingHospId] = useState<string | null>(null);
  const [approvedCredentials, setApprovedCredentials] = useState<any | null>(null);

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

  const fetchUsers = async (search = '') => {
    try {
      setUsersLoading(true);
      setUsersError('');
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch user list');
      }
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        throw new Error(data.error || 'Failed to fetch user list');
      }
    } catch (err: any) {
      console.error(err);
      setUsersError(err.message || 'An error occurred fetching users.');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    try {
      setUpdatingUserId(userId);
      setUsersError('');
      const targetRole = currentRole === 'doctor' ? 'patient' : 'doctor';
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: targetRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: targetRole } : u))
        );
      } else {
        throw new Error(data.error || 'Failed to update user role');
      }
    } catch (err: any) {
      console.error(err);
      setUsersError(err.message || 'An error occurred updating user role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDoctorAction = async (userId: string, action: 'approve' | 'reject') => {
    try {
      setUpdatingUserId(userId);
      setUsersError('');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          role: action === 'approve' ? 'doctor' : 'patient',
          reason: action === 'reject' ? 'Verification requirements not met as determined by MediFlow Administrator.' : '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchUsers(usersSearch);
      } else {
        throw new Error(data.error || `Failed to ${action} doctor application`);
      }
    } catch (err: any) {
      console.error(err);
      setUsersError(err.message || `An error occurred while attempting to ${action} doctor.`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const fetchHospitals = async () => {
    try {
      setHospitalsLoading(true);
      setHospitalsError('');
      const res = await fetch('/api/admin/hospitals');
      const data = await res.json();
      if (res.ok && data.success) {
        setHospitals(data.hospitals || []);
      } else {
        setHospitalsError(data.error || 'Failed to fetch hospital applications');
      }
    } catch (err: any) {
      setHospitalsError('Error loading hospital collaboration requests');
    } finally {
      setHospitalsLoading(false);
    }
  };

  const handleHospitalAction = async (hospitalId: string, action: 'approve' | 'reject') => {
    try {
      setUpdatingHospId(hospitalId);
      setHospitalsError('');
      const res = await fetch('/api/admin/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId, action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (action === 'approve' && data.credentials) {
          setApprovedCredentials(data.credentials);
        }
        fetchHospitals();
      } else {
        throw new Error(data.error || `Failed to ${action} hospital`);
      }
    } catch (err: any) {
      setHospitalsError(err.message || `Error processing ${action} action.`);
    } finally {
      setUpdatingHospId(null);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats();
      fetchUsers();
      fetchHospitals();
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
  const userEmail = session?.user?.email?.toLowerCase().trim();
  const isAdmin = userRole === 'admin' || userEmail === 'heallink.care@gmail.com';

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
          <a
            href="https://patient-mediflow.shanmukhmedisetty.site"
            className="w-full py-2 bg-[#2ab8d8] hover:bg-[#1fb1d1] text-white rounded-xl text-xs font-bold transition block text-center"
          >
            Go to Patient Dashboard
          </a>
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

      {/* Registered Doctors & Patients Logs */}
      <div className="space-y-6">
        {/* Search Bar for All Registration Logs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-sm">
          <div>
            <h3 className="text-sm font-black text-[#003893] uppercase tracking-wider flex items-center gap-2">
              <span>📜</span> Real-Time System Registration Logs
            </h3>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">
              Comprehensive registry of verified doctors and registered patients on the platform.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Filter logs by name or email..."
              value={usersSearch}
              onChange={(e) => {
                setUsersSearch(e.target.value);
                fetchUsers(e.target.value);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-white/85 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2ab8d8] text-gray-700 shadow-sm"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
          </div>
        </div>

        {/* HOSPITAL COLLABORATION APPLICATIONS & PARTNERS */}
        <div className="bg-teal-50/70 backdrop-blur-xl border border-teal-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black text-teal-900 uppercase tracking-widest flex items-center gap-2">
                <span className="text-base">🏥</span> Hospital Collaborations &amp; Partner Management ({hospitals.length})
              </h3>
              <p className="text-[11px] text-teal-700 font-semibold mt-0.5">Review partnership applications &amp; manage hospital admin credentials.</p>
            </div>
            <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-teal-200 text-teal-900 border border-teal-300 self-start sm:self-auto">
              Subdomain: medi-hospadmin.shanmukhmedisetty.site
            </span>
          </div>

          {approvedCredentials && (
            <div className="p-4 bg-emerald-900 text-white rounded-2xl space-y-2 text-xs shadow-lg animate-fade-in border border-emerald-700">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-emerald-300 uppercase tracking-wider">🎉 Hospital Approved & Credentials Generated!</span>
                <button onClick={() => setApprovedCredentials(null)} className="text-xs text-emerald-200 hover:text-white">✕ Close</button>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-xl font-mono text-xs space-y-1 border border-emerald-800">
                <p>Hospital Admin Email: <strong className="text-teal-300">{approvedCredentials.hospitalAdminEmail}</strong></p>
                <p>Hospital ID: <strong className="text-teal-300">{approvedCredentials.hospitalId}</strong></p>
                <p>Generated Password: <strong className="text-amber-300 font-bold">{approvedCredentials.password}</strong></p>
              </div>
              <p className="text-[10px] text-emerald-200">Share these login details with the hospital partner to access the Hospital Admin Dashboard.</p>
            </div>
          )}

          {hospitalsLoading && hospitals.length === 0 ? (
            <div className="py-6 text-center text-xs text-teal-700 font-semibold animate-pulse">
              Loading hospital applications...
            </div>
          ) : hospitals.length === 0 ? (
            <div className="py-6 text-center text-xs text-teal-700 font-semibold bg-white/60 rounded-2xl border border-dashed border-teal-200">
              No hospital collaboration applications received yet.
            </div>
          ) : (
            <div className="space-y-3">
              {hospitals.map((hosp) => {
                const isPending = hosp.status === 'pending';
                const isApproved = hosp.status === 'approved';
                const isUpdating = updatingHospId === hosp.hospitalId;

                return (
                  <div key={hosp.hospitalId} className="p-4 rounded-2xl bg-white border border-teal-150 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-100 pb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white font-black flex items-center justify-center text-sm">
                          🏥
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-black text-[#003893]">{hosp.name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              isPending ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {hosp.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 font-semibold">{hosp.address} | ID: <span className="font-mono text-teal-700 font-bold">{hosp.hospitalId}</span></p>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-gray-500 font-semibold">
                        <p>Doctors Enrolled: <strong className="text-teal-700">{hosp.doctorCount || 0}</strong></p>
                        <p className="text-[10px] text-gray-400">Capacity: {hosp.bedCapacity}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-semibold text-gray-700 bg-teal-50/40 p-2.5 rounded-xl border border-teal-100">
                      <div><span className="text-[9px] text-teal-800 font-bold uppercase block">Contact Email</span>{hosp.contactEmail}</div>
                      <div><span className="text-[9px] text-teal-800 font-bold uppercase block">Phone</span>{hosp.phone}</div>
                      <div><span className="text-[9px] text-teal-800 font-bold uppercase block">Specialties</span>{(hosp.specialties || []).join(', ') || 'General'}</div>
                    </div>

                    {hosp.reasonToJoin && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <strong className="text-gray-700">Collaboration Purpose:</strong> {hosp.reasonToJoin}
                      </p>
                    )}

                    {isApproved && hosp.credentials && (
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                        <span className="text-emerald-900">Admin Email: <strong>{hosp.credentials.hospitalAdminEmail}</strong></span>
                        <span className="text-emerald-900">Temp Password: <strong className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded">{hosp.credentials.rawTempPassword || '••••••••'}</strong></span>
                      </div>
                    )}

                    {isPending && (
                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          onClick={() => handleHospitalAction(hosp.hospitalId, 'reject')}
                          disabled={isUpdating}
                          className="px-3.5 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs font-extrabold transition disabled:opacity-50"
                        >
                          {isUpdating ? 'Updating...' : 'Reject Collaboration'}
                        </button>
                        <button
                          onClick={() => handleHospitalAction(hosp.hospitalId, 'approve')}
                          disabled={isUpdating}
                          className="px-4 py-1.5 rounded-xl bg-teal-600 text-white font-extrabold text-xs hover:bg-teal-700 shadow transition disabled:opacity-50"
                        >
                          {isUpdating ? 'Approving...' : 'Approve & Generate Credentials'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {usersError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2 text-xs text-red-700 font-semibold">
            <span>⚠️</span>
            <span>{usersError}</span>
          </div>
        )}

        {/* PENDING DOCTOR VERIFICATION APPLICATIONS */}
        <div className="bg-amber-50/70 backdrop-blur-xl border border-amber-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
              <span className="text-base">⏳</span> Pending Doctor Verification Requests ({users.filter((u) => u.doctorApplicationStatus === 'pending').length})
            </h3>
            <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
              Admin Verification Queue
            </span>
          </div>

          {users.filter((u) => u.doctorApplicationStatus === 'pending').length === 0 ? (
            <div className="py-6 text-center text-xs text-amber-700/70 font-semibold bg-white/60 rounded-2xl border border-dashed border-amber-200">
              ✅ No pending doctor verification requests at this time. All doctor accounts are up to date!
            </div>
          ) : (
            <div className="space-y-4">
              {users
                .filter((u) => u.doctorApplicationStatus === 'pending')
                .map((appUser) => {
                  const dp = appUser.doctorProfile || {};
                  const isUpdating = updatingUserId === appUser.id;

                  return (
                    <div
                      key={appUser.id}
                      className="p-5 rounded-2xl bg-white border border-amber-200 shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white font-black flex items-center justify-center text-lg shadow-sm">
                            👨‍⚕️
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-[#003893]">
                                {appUser.name}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                dp.doctorJoinType === 'hospital' || dp.hospitalId
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : 'bg-sky-100 text-sky-900 border border-sky-200'
                              }`}>
                                {dp.doctorJoinType === 'hospital' || dp.hospitalId ? '🏥 Hospital Doctor' : '👤 Individual Doctor'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-semibold">{appUser.email}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-xl self-start sm:self-auto border border-amber-200">
                          Submitted: {dp.appliedAt ? new Date(dp.appliedAt).toLocaleDateString() : 'Recently'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-semibold text-gray-700">
                        <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                          <span className="text-[9px] font-extrabold text-amber-900 uppercase block">Department</span>
                          <span className="font-extrabold text-[#003893]">{dp.department || 'Not specified'}</span>
                        </div>

                        <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                          <span className="text-[9px] font-extrabold text-amber-900 uppercase block">Medical License #</span>
                          <span className="font-mono font-bold text-gray-800">{dp.licenseNumber || 'N/A'}</span>
                        </div>

                        <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                          <span className="text-[9px] font-extrabold text-amber-900 uppercase block">Hospital / Clinic</span>
                          <span className="font-bold text-gray-800">{dp.hospitalAffiliation || 'N/A'}</span>
                        </div>

                        <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                          <span className="text-[9px] font-extrabold text-amber-900 uppercase block">Contact Phone &amp; Exp</span>
                          <span className="font-bold text-gray-800">{dp.phone || 'N/A'} ({dp.experienceYears || '1+'} yrs)</span>
                        </div>
                      </div>

                      {dp.qualifications && (
                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600">
                          <span className="font-bold text-gray-700">Qualifications &amp; Degrees:</span> {dp.qualifications}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-amber-100">
                        <button
                          onClick={() => handleDoctorAction(appUser.id, 'reject')}
                          disabled={isUpdating}
                          className="px-4 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-extrabold text-xs transition-all disabled:opacity-50"
                        >
                          {isUpdating ? 'Updating...' : '❌ Reject Application'}
                        </button>
                        <button
                          onClick={() => handleDoctorAction(appUser.id, 'approve')}
                          disabled={isUpdating}
                          className="px-5 py-2 rounded-xl bg-[#003893] text-white font-extrabold text-xs hover:bg-[#002868] shadow-md transition-all disabled:opacity-50"
                        >
                          {isUpdating ? 'Updating...' : '✅ Approve & Grant Doctor Access'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* LOG 1: Registered Doctors Log */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[#003893] uppercase tracking-widest flex items-center gap-2">
              <span className="text-base">🩺</span> Registered Doctors Log ({users.filter((u) => u.role === 'doctor' || u.role === 'admin').length})
            </h3>
            <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              Verified Medical Providers
            </span>
          </div>

          {usersLoading && users.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400 font-semibold animate-pulse">
              Loading doctor registrations...
            </div>
          ) : users.filter((u) => u.role === 'doctor' || u.role === 'admin').length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400 font-bold bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              No registered doctors found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-150 bg-white/70 shadow-inner">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-150 bg-sky-50/70 text-[#003893] font-bold">
                    <th className="p-3">Doctor Details</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Department / Access Role</th>
                    <th className="p-3">Registered Date</th>
                    <th className="p-3 text-right">Portal Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150/40 font-semibold text-gray-600">
                  {users
                    .filter((u) => u.role === 'doctor' || u.role === 'admin')
                    .map((user) => {
                      const isPrimaryAdmin = user.email.toLowerCase().trim() === 'heallink.care@gmail.com';
                      const formattedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active User';

                      return (
                        <tr key={user.id} className="hover:bg-sky-50/30 transition">
                          <td className="p-3 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-[#003893] text-white font-black flex items-center justify-center text-xs shadow-sm">
                              👨‍⚕️
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-800 leading-tight">
                                {user.name.startsWith('Dr.') ? user.name : `Dr. ${user.name}`}
                              </p>
                              {isPrimaryAdmin && (
                                <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold uppercase mt-0.5 inline-block">
                                  Primary Admin
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-semibold text-gray-500">{user.email}</td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-sky-100 text-sky-800 border border-sky-200">
                              {user.emrProfile?.department || (user.role === 'admin' ? 'System Administrator' : 'General Medicine')}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500 font-mono text-[11px]">{formattedDate}</td>
                          <td className="p-3 text-right">
                            {isPrimaryAdmin ? (
                              <span className="text-[10px] text-gray-400 font-semibold italic">System Admin</span>
                            ) : (
                              <button
                                onClick={() => handleToggleUserRole(user.id, user.role)}
                                disabled={updatingUserId === user.id}
                                className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition shadow-sm disabled:opacity-50"
                              >
                                Revoke Doctor Portal Access
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* LOG 2: Registered Patients Log */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[#003893] uppercase tracking-widest flex items-center gap-2">
              <span className="text-base">👥</span> Registered Patients Log ({users.filter((u) => u.role === 'patient').length})
            </h3>
            <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Registered Patient Directory
            </span>
          </div>

          {usersLoading && users.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400 font-semibold animate-pulse">
              Loading patient registrations...
            </div>
          ) : users.filter((u) => u.role === 'patient').length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400 font-bold bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              No registered patients found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-150 bg-white/70 shadow-inner">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-150 bg-emerald-50/70 text-[#003893] font-bold">
                    <th className="p-3">Patient Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">EMR Form Status</th>
                    <th className="p-3">Registered Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150/40 font-semibold text-gray-600">
                  {users
                    .filter((u) => u.role === 'patient')
                    .map((user) => {
                      const formattedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active User';
                      const isEmrDone = user.isEmrCompleted;

                      return (
                        <tr key={user.id} className="hover:bg-emerald-50/30 transition">
                          <td className="p-3 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs shadow-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-800 leading-tight">{user.name}</p>
                            </div>
                          </td>
                          <td className="p-3 font-semibold text-gray-500">{user.email}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                isEmrDone
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {isEmrDone ? '✅ EMR Completed' : '⚠️ Pending EMR Form'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500 font-mono text-[11px]">{formattedDate}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleToggleUserRole(user.id, user.role)}
                              disabled={updatingUserId === user.id}
                              className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-[#2ab8d8]/10 hover:bg-[#2ab8d8]/20 text-[#2ab8d8] border border-[#2ab8d8]/30 transition shadow-sm disabled:opacity-50"
                            >
                              Grant Doctor Portal Access
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
