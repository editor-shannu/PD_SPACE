'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import KafkaRedisMonitor from '@/components/KafkaRedisMonitor';

export default function HospitalAdminPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'doctors' | 'pending' | 'appointments' | 'settings'>('dashboard');

  // Auth / Form states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Application form states (Google user)
  const [appStatus, setAppStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [appDetails, setAppDetails] = useState<any>(null);
  const [loadingApp, setLoadingApp] = useState(true);

  // Application Form Input
  const [hospName, setHospName] = useState('');
  const [hospAddress, setHospAddress] = useState('');
  const [hospPhone, setHospPhone] = useState('');
  const [hospContactEmail, setHospContactEmail] = useState('');
  const [bedCapacity, setBedCapacity] = useState('100-250 beds');
  const [specialties, setSpecialties] = useState<string[]>(['General Medicine', 'Emergency Care']);
  const [reasonToJoin, setReasonToJoin] = useState('');
  const [appError, setAppError] = useState('');
  const [appSuccess, setAppSuccess] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // Hospital Dashboard Data
  const [dashData, setDashData] = useState<any>(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [dashError, setDashError] = useState('');

  // Actions states
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRejectDocId, setSelectedRejectDocId] = useState<string | null>(null);
  
  // Settings / Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passMsg, setPassMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const isHospitalAdmin = session?.user && (
    (session.user as any).role === 'hospital_admin' ||
    Boolean((session.user as any).hospitalId) ||
    appStatus === 'approved'
  );

  // Check application status if user logged in via Google
  useEffect(() => {
    if (session?.user) {
      fetchAppStatus();
    }
  }, [session]);

  // Fetch hospital dashboard data if user is hospital_admin
  useEffect(() => {
    if (session?.user && isHospitalAdmin) {
      fetchDashboardData();
    }
  }, [session, isHospitalAdmin]);

  const fetchAppStatus = async () => {
    try {
      setLoadingApp(true);
      const res = await fetch('/api/hospital/apply');
      const data = await res.json();
      if (data.success) {
        if (data.hasApplication) {
          setAppStatus(data.status);
          setAppDetails(data.hospital);
        } else {
          setAppStatus('none');
        }
      }
    } catch (err) {
      console.error('Error fetching application status:', err);
    } finally {
      setLoadingApp(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoadingDash(true);
      setDashError('');
      const res = await fetch('/api/hospital/admin');
      const data = await res.json();
      if (data.success) {
        setDashData(data);
      } else {
        setDashError(data.error || 'Failed to load hospital data');
      }
    } catch (err: any) {
      setDashError('Error connecting to hospital administration server');
    } finally {
      setLoadingDash(false);
    }
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !loginPassword) {
      setLoginError('Please enter your Hospital ID / Email and Password.');
      return;
    }

    try {
      setIsLoggingIn(true);
      setLoginError('');

      const res = await signIn('credentials', {
        email: loginIdentifier.trim(),
        password: loginPassword.trim(),
        hospitalAuth: 'true',
        redirect: false,
      });

      if (!res || res.error || !res.ok) {
        if (res?.error && res.error !== 'CredentialsSignin') {
          setLoginError(res.error);
        } else {
          setLoginError('Invalid Hospital ID / Email or Password. Please verify your credentials.');
        }
      } else {
        // Successful login: reload window to populate NextAuth session
        window.location.reload();
      }
    } catch (err: any) {
      setLoginError('Sign in failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppError('');
    setAppSuccess('');

    if (!hospName || !hospAddress || !hospPhone || !hospContactEmail || !reasonToJoin) {
      setAppError('Please fill in all mandatory fields.');
      return;
    }

    try {
      setIsSubmittingApp(true);
      const res = await fetch('/api/hospital/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hospName,
          address: hospAddress,
          phone: hospPhone,
          contactEmail: hospContactEmail,
          bedCapacity,
          specialties,
          reasonToJoin,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAppSuccess(data.message);
        setAppStatus('pending');
        fetchAppStatus();
      } else {
        setAppError(data.error || 'Submission failed');
      }
    } catch (err) {
      setAppError('Failed to submit application. Network error.');
    } finally {
      setIsSubmittingApp(false);
    }
  };

  const handleApproveDoctor = async (doctorUserId: string) => {
    try {
      setProcessingDocId(doctorUserId);
      const res = await fetch('/api/hospital/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_doctor',
          doctorUserId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchDashboardData();
      } else {
        alert(data.error || 'Failed to approve doctor');
      }
    } catch (err) {
      alert('Error approving doctor');
    } finally {
      setProcessingDocId(null);
    }
  };

  const handleRejectDoctor = async (doctorUserId: string) => {
    try {
      setProcessingDocId(doctorUserId);
      const res = await fetch('/api/hospital/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_doctor',
          doctorUserId,
          reason: rejectReason || 'Profile requirements not met for hospital affiliation.',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedRejectDocId(null);
        setRejectReason('');
        fetchDashboardData();
      } else {
        alert(data.error || 'Failed to reject doctor');
      }
    } catch (err) {
      alert('Error rejecting doctor');
    } finally {
      setProcessingDocId(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword !== confirmPassword) {
      setPassMsg({ text: 'Passwords do not match.', isError: true });
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg({ text: 'Password must be at least 6 characters long.', isError: true });
      return;
    }

    try {
      setIsChangingPass(true);
      const res = await fetch('/api/hospital/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPassMsg({ text: data.message, isError: false });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassMsg({ text: data.error || 'Failed to change password', isError: true });
      }
    } catch (err) {
      setPassMsg({ text: 'Network error updating password.', isError: true });
    } finally {
      setIsChangingPass(false);
    }
  };

  const toggleSpecialty = (spec: string) => {
    if (specialties.includes(spec)) {
      setSpecialties(specialties.filter((s) => s !== spec));
    } else {
      setSpecialties([...specialties, spec]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f4f8] via-[#f0f8fc] to-[#f5fbff] text-gray-800 flex flex-col font-sans selection:bg-[#2ab8d8] selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/80 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#2ab8d8] flex items-center justify-center shadow-md shadow-[#2ab8d8]/30 text-white">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V9a2 2 0 012-2h2a2 2 0 012 2v12" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-[#003893]">
              MediFlow <span className="text-[#2ab8d8]">Hospital Portal</span>
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">medi-hospadmin.shanmukhmedisetty.site</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {session?.user ? (
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-extrabold text-[#003893]">{session.user.name}</p>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#2ab8d8]/15 text-[#003893]">
                  {isHospitalAdmin ? 'Hospital Administrator' : 'Applicant'}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/hospadmin' })}
                className="px-3.5 py-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition border border-gray-200"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <a
              href="https://mediflow.shanmukhmedisetty.site"
              className="text-xs font-extrabold text-[#003893] hover:text-[#2ab8d8] transition px-3.5 py-2 rounded-2xl bg-white/80 border border-white/90 shadow-sm"
            >
              Back to Main Platform →
            </a>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* VIEW 1: AUTHENTICATED HOSPITAL ADMIN DASHBOARD */}
        {isHospitalAdmin ? (
          <div className="space-y-6">
            {/* Hospital Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003893] to-[#2ab8d8] p-6 sm:p-8 text-white shadow-lg">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-extrabold mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Verified Hospital Partner</span>
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight">
                    {dashData?.hospital?.name || (session.user as any).hospitalName || 'Hospital Admin Portal'}
                  </h2>
                  <p className="text-xs font-semibold text-white/80 mt-1">
                    Hospital ID: <span className="font-mono font-bold text-cyan-200">{dashData?.hospital?.hospitalId || (session.user as any).hospitalId}</span> | Address: {dashData?.hospital?.address || 'Partner Facility'}
                  </p>
                </div>

                <div className="flex items-center space-x-3 bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/20">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Collaborated Status</p>
                    <p className="text-xs font-black text-emerald-300">Active Partner</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200/60 space-x-2 sm:space-x-3 overflow-x-auto pb-2">
              {[
                { id: 'dashboard', label: 'Overview & Stats', icon: '📊' },
                { id: 'pending', label: `Pending Approvals (${dashData?.stats?.pendingApprovals || 0})`, icon: '⏳' },
                { id: 'doctors', label: `Active Doctors (${dashData?.stats?.totalDoctors || 0})`, icon: '👨‍⚕️' },
                { id: 'appointments', label: 'Appointments', icon: '📅' },
                { id: 'settings', label: 'Hospital Credentials', icon: '🔐' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#003893] text-white shadow-md'
                      : 'bg-white/60 text-gray-600 hover:text-[#003893] hover:bg-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {loadingDash ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-[#2ab8d8]/30 border-t-[#003893] rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold text-gray-500">Syncing hospital records & doctors...</p>
              </div>
            ) : dashError ? (
              <div className="p-6 bg-red-50 border border-red-200 rounded-3xl text-red-700 text-xs font-bold flex items-center justify-between">
                <span>{dashError}</span>
                <button onClick={fetchDashboardData} className="px-3.5 py-1.5 bg-red-600 text-white text-xs rounded-xl font-bold">Retry</button>
              </div>
            ) : (
              <>
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Doctors</p>
                          <p className="text-3xl font-black text-[#003893] mt-1">{dashData?.stats?.totalDoctors || 0}</p>
                          <p className="text-[10px] font-bold text-teal-600 mt-1">Affiliated practitioners</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-[#2ab8d8]/15 flex items-center justify-center text-[#003893] text-xl font-black">👨‍⚕️</div>
                      </div>

                      <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Approvals</p>
                          <p className="text-3xl font-black text-amber-600 mt-1">{dashData?.stats?.pendingApprovals || 0}</p>
                          <p className="text-[10px] font-bold text-amber-600 mt-1">Requests requiring review</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 text-xl font-black">⏳</div>
                      </div>

                      <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hospital Appointments</p>
                          <p className="text-3xl font-black text-cyan-700 mt-1">{dashData?.stats?.totalAppointments || 0}</p>
                          <p className="text-[10px] font-bold text-cyan-700 mt-1">Total scheduled bookings</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-700 text-xl font-black">📅</div>
                      </div>

                      <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Patients</p>
                          <p className="text-3xl font-black text-emerald-700 mt-1">{dashData?.stats?.totalPatients || 0}</p>
                          <p className="text-[10px] font-bold text-emerald-700 mt-1">Unique patients served</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700 text-xl font-black">🏥</div>
                      </div>
                    </div>

                    {/* Kafka & Redis Crowd Control Stream */}
                    <KafkaRedisMonitor role="hospitaladmin" title="Hospital ER & Crowd Capacity Telemetry Engine" />

                    {/* Quick Doctor Join Approvals Preview */}
                    <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-[#003893]">Pending Doctor Requests</h3>
                        <button onClick={() => setActiveTab('pending')} className="text-xs font-bold text-[#2ab8d8] hover:underline">View All →</button>
                      </div>

                      {dashData?.pendingDoctors?.length === 0 ? (
                        <p className="text-xs text-gray-500 font-medium py-4 text-center">No pending doctor requests for {dashData?.hospital?.name}. All current doctor applications are resolved.</p>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {dashData?.pendingDoctors?.slice(0, 3).map((doc: any) => (
                            <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-[#003893]">Dr. {doc.name}</p>
                                <p className="text-xs text-gray-500 font-medium">{doc.department} | License #: {doc.licenseNumber} | Phone: {doc.phone}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleApproveDoctor(doc.id)}
                                  disabled={processingDocId === doc.id}
                                  className="px-3.5 py-1.5 text-xs font-extrabold bg-[#003893] hover:bg-[#002868] text-white rounded-xl transition disabled:opacity-50 shadow"
                                >
                                  Approve Doctor
                                </button>
                                <button
                                  onClick={() => setSelectedRejectDocId(doc.id)}
                                  className="px-3.5 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: PENDING DOCTOR REQUESTS */}
                {activeTab === 'pending' && (
                  <div className="p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-xl font-black text-[#003893]">Pending Doctor Affiliation Approvals</h3>
                      <p className="text-xs text-gray-500 font-medium">These doctors registered in the MediFlow platform requesting to join under <span className="text-[#003893] font-bold">{dashData?.hospital?.name}</span>.</p>
                    </div>

                    {dashData?.pendingDoctors?.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-500 text-xs font-bold">No pending doctor verification applications.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dashData?.pendingDoctors?.map((doc: any) => (
                          <div key={doc.id} className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-base font-bold text-[#003893]">Dr. {doc.name}</h4>
                                <span className="px-2.5 py-0.5 text-[10px] rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-extrabold uppercase">Pending Verification</span>
                              </div>
                              <p className="text-xs text-gray-600 font-medium">Email: {doc.email} | Phone: {doc.phone}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-2">
                                <span className="bg-gray-100 px-2.5 py-1 rounded-xl border border-gray-200 font-semibold">Dept: <strong className="text-[#003893]">{doc.department}</strong></span>
                                <span className="bg-gray-100 px-2.5 py-1 rounded-xl border border-gray-200 font-semibold">License #: <strong className="text-[#003893]">{doc.licenseNumber}</strong></span>
                                <span className="bg-gray-100 px-2.5 py-1 rounded-xl border border-gray-200 font-semibold">Experience: <strong className="text-[#003893]">{doc.experienceYears} yrs</strong></span>
                              </div>
                              {doc.qualifications && (
                                <p className="text-xs text-gray-500 font-medium pt-1">Qualifications: {doc.qualifications}</p>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <button
                                onClick={() => handleApproveDoctor(doc.id)}
                                disabled={processingDocId === doc.id}
                                className="px-4 py-2 text-xs font-black bg-[#003893] hover:bg-[#002868] text-white rounded-xl transition disabled:opacity-50 shadow-md shadow-[#003893]/20"
                              >
                                {processingDocId === doc.id ? 'Approving...' : 'Approve Doctor'}
                              </button>
                              <button
                                onClick={() => setSelectedRejectDocId(doc.id)}
                                className="px-4 py-2 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reject Dialog Modal */}
                    {selectedRejectDocId && (
                      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white border border-gray-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                          <h4 className="text-lg font-black text-[#003893]">Decline Doctor Request</h4>
                          <p className="text-xs text-gray-600 font-medium">Specify a reason for declining doctor affiliation with {dashData?.hospital?.name}:</p>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection (e.g. License verification failed, not currently listed in hospital staff)..."
                            className="w-full h-24 bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                          />
                          <div className="flex justify-end space-x-3">
                            <button
                              onClick={() => { setSelectedRejectDocId(null); setRejectReason(''); }}
                              className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRejectDoctor(selectedRejectDocId)}
                              disabled={processingDocId === selectedRejectDocId}
                              className="px-4 py-2 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl shadow"
                            >
                              Confirm Rejection
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: ACTIVE DOCTORS */}
                {activeTab === 'doctors' && (
                  <div className="p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-xl font-black text-[#003893]">Hospital Affiliated Doctors</h3>
                      <p className="text-xs text-gray-500 font-medium">Active doctors practicing under <span className="text-[#003893] font-bold">{dashData?.hospital?.name}</span>.</p>
                    </div>

                    {dashData?.activeDoctors?.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-500 text-xs font-bold">No approved doctors currently registered under this hospital.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dashData?.activeDoctors?.map((doc: any) => (
                          <div key={doc.id} className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-bold text-[#003893]">Dr. {doc.name}</h4>
                                <span className="px-2.5 py-0.5 text-[10px] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold uppercase">Verified</span>
                              </div>
                              <p className="text-xs text-gray-600 font-medium">{doc.department} | License #: {doc.licenseNumber}</p>
                              <p className="text-xs text-gray-400 font-medium">Contact: {doc.email} | {doc.phone}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: APPOINTMENTS */}
                {activeTab === 'appointments' && (
                  <div className="p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-xl font-black text-[#003893]">Hospital Clinical Appointments</h3>
                      <p className="text-xs text-gray-500 font-medium">Real-time consultation bookings for doctors of <span className="text-[#003893] font-bold">{dashData?.hospital?.name}</span>.</p>
                    </div>

                    {dashData?.appointments?.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-500 text-xs font-bold">No appointment records found for doctors of this hospital.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-700">
                          <thead className="bg-gray-100/70 text-gray-500 uppercase font-mono border-b border-gray-200">
                            <tr>
                              <th className="py-3 px-4">Patient</th>
                              <th className="py-3 px-4">Assigned Doctor</th>
                              <th className="py-3 px-4">Department</th>
                              <th className="py-3 px-4">Date & Time</th>
                              <th className="py-3 px-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {dashData?.appointments?.map((app: any) => (
                              <tr key={app.id} className="hover:bg-gray-50/60 transition">
                                <td className="py-3 px-4 font-bold text-[#003893]">{app.patientName}</td>
                                <td className="py-3 px-4 text-[#2ab8d8] font-semibold">Dr. {app.doctorName}</td>
                                <td className="py-3 px-4">{app.department}</td>
                                <td className="py-3 px-4">{app.date} at {app.time}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-extrabold ${
                                    app.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {app.status || 'scheduled'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: SETTINGS & PASSWORD ROTATION */}
                {activeTab === 'settings' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Hospital Info */}
                    <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-4">
                      <h3 className="text-lg font-black text-[#003893]">Hospital Credential Information</h3>
                      <div className="space-y-3 text-xs font-semibold text-gray-700">
                        <div>
                          <label className="text-gray-400 uppercase text-[10px] font-bold">Hospital Name</label>
                          <p className="text-sm font-bold text-[#003893]">{dashData?.hospital?.name}</p>
                        </div>
                        <div>
                          <label className="text-gray-400 uppercase text-[10px] font-bold">Assigned Hospital ID</label>
                          <p className="text-sm font-mono text-[#003893] bg-gray-50 p-2.5 rounded-2xl border border-gray-200 font-bold">{dashData?.hospital?.hospitalId}</p>
                        </div>
                        <div>
                          <label className="text-gray-400 uppercase text-[10px] font-bold">Hospital Admin Email</label>
                          <p className="text-sm font-mono text-gray-800 bg-gray-50 p-2.5 rounded-2xl border border-gray-200 font-semibold">{dashData?.hospital?.contactEmail}</p>
                        </div>
                      </div>
                    </div>

                    {/* Change Password */}
                    <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm">
                      <h3 className="text-lg font-black text-[#003893] mb-1">Rotate Hospital Admin Password</h3>
                      <p className="text-xs text-gray-500 font-medium mb-4">Update temporary password provided during collaboration approval to a permanent password.</p>

                      <form onSubmit={handleChangePassword} className="space-y-4">
                        {passMsg && (
                          <div className={`p-3 rounded-2xl text-xs font-bold ${passMsg.isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                            {passMsg.text}
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase text-[10px] mb-1">New Password</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Minimum 6 characters"
                              className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl px-3.5 py-2.5 pr-10 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#003893] transition text-xs font-bold"
                              title={showNewPassword ? 'Hide password' : 'Show password'}
                            >
                              {showNewPassword ? '🙈 Hide' : '👁️ Show'}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase text-[10px] mb-1">Confirm New Password</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Re-enter new password"
                              className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl px-3.5 py-2.5 pr-10 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isChangingPass}
                          className="w-full py-3 bg-[#003893] hover:bg-[#002868] text-white font-black text-xs rounded-2xl shadow-md transition disabled:opacity-50"
                        >
                          {isChangingPass ? 'Updating Password...' : 'Save New Password'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* VIEW 2: NON-HOSPITAL ADMIN LANDING / REGISTRATION / LOGIN */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-4">
            {/* Left Column: Hospital Admin Login & Portal Explanation */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#2ab8d8]/15 border border-[#2ab8d8]/30 text-[#003893] text-xs font-extrabold">
                  <span>Authorized Hospital Administrative Access</span>
                </div>
                <h2 className="text-3xl font-black text-[#003893] tracking-tight leading-tight">
                  Hospital Partner Management Portal
                </h2>
                <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                  Dedicated administration system for partnered hospitals to control affiliated doctors, approve staff applications, and oversee patient care data.
                </p>
              </div>

              {/* Login Card */}
              <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-base font-black text-[#003893]">Hospital Admin Sign In</h3>
                  <span className="text-[10px] text-[#003893] font-mono bg-[#2ab8d8]/15 px-2.5 py-0.5 rounded-full font-bold">Credentials Auth</span>
                </div>

                {loginError && (
                  <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleCredentialLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase text-[10px] mb-1">Hospital ID / Admin Email</label>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. HOSP-92841 or admin@cityhospital.com"
                      className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2ab8d8] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase text-[10px] mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter temporary or permanent password"
                        className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl px-3.5 py-2.5 pr-12 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2ab8d8] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#003893] transition text-xs font-bold"
                        title={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? '🙈 Hide' : '👁️ Show'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3 bg-[#003893] hover:bg-[#002868] text-white font-black text-xs rounded-2xl shadow-md transition disabled:opacity-50"
                  >
                    {isLoggingIn ? 'Authenticating...' : 'Sign In as Hospital Admin'}
                  </button>
                </form>

                <div className="pt-2 text-center text-xs text-gray-500 font-medium">
                  <span>Don&apos;t have hospital credentials yet? Apply for collaboration below.</span>
                </div>
              </div>
            </div>

            {/* Right Column: Google Auth & Hospital Onboarding Form */}
            <div className="lg:col-span-7 space-y-6">
              {!session?.user ? (
                <div className="p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-6 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-[#2ab8d8]/15 border border-[#2ab8d8]/30 flex items-center justify-center mx-auto text-[#003893] text-2xl font-black">
                    🏥
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#003893] mb-2">Hospital Partner Registration</h3>
                    <p className="text-xs text-gray-600 font-semibold max-w-md mx-auto">
                      Sign in with Google to fill the hospital collaboration form. Main Admin will review your application and generate your unique Hospital Admin credentials.
                    </p>
                  </div>

                  <button
                    onClick={() => signIn('google', { callbackUrl: '/hospadmin' })}
                    className="inline-flex items-center space-x-3 px-6 py-3.5 bg-[#003893] hover:bg-[#002868] text-white font-black text-xs rounded-2xl shadow-md transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign In with Google to Apply</span>
                  </button>
                </div>
              ) : loadingApp ? (
                <div className="p-12 text-center bg-white/80 border border-white/90 rounded-3xl shadow-sm">
                  <div className="w-8 h-8 border-2 border-[#2ab8d8]/30 border-t-[#003893] rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-gray-500">Loading your hospital collaboration profile...</p>
                </div>
              ) : appStatus === 'pending' ? (
                <div className="p-8 rounded-3xl bg-amber-50 border border-amber-200 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto text-amber-700 text-2xl font-black">⏳</div>
                  <div>
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-black uppercase">Under Review</span>
                    <h3 className="text-xl font-black text-[#003893] mt-3">Hospital Application Pending Approval</h3>
                    <p className="text-xs text-gray-600 font-semibold max-w-md mx-auto mt-2">
                      Your collaboration application for <strong className="text-[#003893]">{appDetails?.name}</strong> is currently being reviewed by MediFlow Main Administrators.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-gray-200 text-left text-xs font-semibold space-y-2 text-gray-700">
                    <p><span className="text-gray-400">Assigned Hospital ID:</span> <strong className="text-[#003893] font-mono">{appDetails?.hospitalId}</strong></p>
                    <p><span className="text-gray-400">Contact Email:</span> <strong>{appDetails?.contactEmail}</strong></p>
                    <p><span className="text-gray-400">Phone:</span> <strong>{appDetails?.phone}</strong></p>
                  </div>
                </div>
              ) : appStatus === 'approved' ? (
                <div className="p-8 rounded-3xl bg-emerald-50 border border-emerald-200 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-black">🎉</div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black uppercase">Approved Hospital Partner</span>
                      <h3 className="text-lg font-black text-[#003893]">{appDetails?.name}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-gray-700 font-semibold">
                    Your collaboration application has been approved! Use the generated credentials below to sign in as Hospital Administrator on this domain.
                  </p>

                  <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-2 text-xs font-mono">
                    <p><span className="text-gray-400">Hospital ID / Login:</span> <strong className="text-[#003893]">{appDetails?.hospitalId}</strong></p>
                    <p><span className="text-gray-400">Temporary Password:</span> <strong className="text-amber-600">{appDetails?.credentials?.rawTempPassword || 'Provided by Admin'}</strong></p>
                  </div>

                  <button
                    onClick={() => {
                      setLoginIdentifier(appDetails?.hospitalId || '');
                      setLoginPassword(appDetails?.credentials?.rawTempPassword || '');
                    }}
                    className="w-full py-3 bg-[#003893] hover:bg-[#002868] text-white font-black text-xs rounded-2xl shadow-md transition"
                  >
                    Fill Credentials into Login Box →
                  </button>
                </div>
              ) : (
                /* REGISTRATION FORM */
                <div className="p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-[#003893]">Hospital Collaboration Application Form</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">Provide hospital details for verification by MediFlow Main Administration.</p>
                  </div>

                  {appError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl">{appError}</div>
                  )}
                  {appSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-2xl">{appSuccess}</div>
                  )}

                  <form onSubmit={handleApplicationSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase text-[10px] mb-1">Hospital Name *</label>
                        <input
                          type="text"
                          value={hospName}
                          onChange={(e) => setHospName(e.target.value)}
                          placeholder="e.g. City General Hospital"
                          className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase text-[10px] mb-1">Official Contact Email *</label>
                        <input
                          type="email"
                          value={hospContactEmail}
                          onChange={(e) => setHospContactEmail(e.target.value)}
                          placeholder="admin@hospital.com"
                          className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase text-[10px] mb-1">Phone Number *</label>
                        <input
                          type="text"
                          value={hospPhone}
                          onChange={(e) => setHospPhone(e.target.value)}
                          placeholder="+1 555-0192"
                          className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase text-[10px] mb-1">Bed Capacity</label>
                        <select
                          value={bedCapacity}
                          onChange={(e) => setBedCapacity(e.target.value)}
                          className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                        >
                          <option value="Under 50 beds">Under 50 beds</option>
                          <option value="50-100 beds">50-100 beds</option>
                          <option value="100-250 beds">100-250 beds</option>
                          <option value="250-500 beds">250-500 beds</option>
                          <option value="500+ beds">500+ beds</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase text-[10px] mb-1">Hospital Address / Location *</label>
                      <input
                        type="text"
                        value={hospAddress}
                        onChange={(e) => setHospAddress(e.target.value)}
                        placeholder="123 Medical Center Way, Building B"
                        className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase text-[10px] mb-1.5">Specialties Offered</label>
                      <div className="flex flex-wrap gap-2">
                        {['General Medicine', 'Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Emergency Care', 'Surgery', 'Oncology'].map((spec) => (
                          <button
                            key={spec}
                            type="button"
                            onClick={() => toggleSpecialty(spec)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                              specialties.includes(spec)
                                ? 'bg-[#2ab8d8]/15 text-[#003893] border-[#2ab8d8]/30'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {specialties.includes(spec) ? '✓ ' : '+ '}{spec}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase text-[10px] mb-1">Reason for MediFlow Collaboration *</label>
                      <textarea
                        value={reasonToJoin}
                        onChange={(e) => setReasonToJoin(e.target.value)}
                        placeholder="Describe why your hospital wants to integrate with MediFlow (e.g., streamline doctor management, patient EMR sharing)..."
                        className="w-full h-24 bg-gray-50/80 border border-gray-200 rounded-2xl p-3 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingApp}
                      className="w-full py-3.5 bg-[#003893] hover:bg-[#002868] text-white font-black text-xs rounded-2xl shadow-md transition disabled:opacity-50"
                    >
                      {isSubmittingApp ? 'Submitting Application...' : 'Submit Collaboration Application'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
