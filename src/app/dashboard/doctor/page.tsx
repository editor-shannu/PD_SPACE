'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Patient {
  id: string;
  name: string;
  email: string;
  role: string;
  documentCount: number;
  alertCount: number;
}

interface AlertItem {
  _id?: string;
  id?: string;
  patientId: string;
  type: 'duplicate' | 'conflict' | 'missed_followup';
  severity: 'low' | 'medium' | 'high';
  message: string;
  related_medication_or_document_id?: string;
  createdAt?: string;
}

interface DocumentItem {
  _id?: string;
  id?: string;
  fileName: string;
  fileType: string;
  fileUrl?: string;
  rawText?: string;
  createdAt?: string;
  extractedData?: {
    document_type?: string;
    doctor_name?: string;
    date?: string;
    diagnosis?: string;
    medications?: Array<{ name: string; dosage?: string; frequency?: string }>;
    follow_up_date?: string;
    notes?: string;
  };
}

interface AppointmentItem {
  _id: string;
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  urgency: 'routine' | 'soon' | 'urgent';
  completedDetails?: {
    completionDate?: string;
    clinicalNotes?: string;
    testResultsSummary?: string;
    doctorSignature?: string;
  };
  createdAt?: string;
}

export default function DoctorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Appointments & Notifications State
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [activeTab, setActiveTab] = useState<'patients' | 'appointments'>('patients');

  // Checkup Completion Modal State
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);
  const [completionDate, setCompletionDate] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [testResultsSummary, setTestResultsSummary] = useState('');
  const [doctorSignature, setDoctorSignature] = useState('');
  const [isSubmittingCheckup, setIsSubmittingCheckup] = useState(false);
  const [checkupSuccessMsg, setCheckupSuccessMsg] = useState('');

  const [summaryData, setSummaryData] = useState<{
    patient?: { id: string; name: string; email: string };
    summary?: string;
    medications?: Array<{ name: string; dosage?: string; frequency?: string }>;
    alerts?: AlertItem[];
    timeline?: DocumentItem[];
  } | null>(null);

  const userRole = (session?.user as any)?.role || 'patient';
  const doctorName = session?.user?.name || 'Doctor';

  // Fetch appointments for doctor portal
  const fetchAppointments = useCallback(async () => {
    setIsLoadingAppointments(true);
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error('Error fetching doctor appointments:', err);
    } finally {
      setIsLoadingAppointments(false);
    }
  }, []);

  // Fetch list of patients
  const fetchPatients = useCallback(async (query: string = '') => {
    setIsLoadingPatients(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/doctor/patients?search=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setPatients(data.patients || []);
      } else {
        setErrorMsg(data.error || 'Failed to fetch patients.');
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      setErrorMsg('Network error while loading patients.');
    } finally {
      setIsLoadingPatients(false);
    }
  }, []);

  // Fetch doctor summary for selected patient
  const fetchPatientSummary = useCallback(async (patientId: string) => {
    setIsLoadingSummary(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/doctor/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSummaryData(data);
      } else {
        setErrorMsg(data.error || 'Failed to generate summary.');
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
      setErrorMsg('Network error while generating pre-consultation summary.');
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (status === 'authenticated') {
      if (userRole === 'doctor' || userRole === 'admin') {
        fetchPatients('');
        fetchAppointments();
      }
    }
  }, [status, userRole, fetchPatients, fetchAppointments]);

  // Handle patient selection
  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    fetchPatientSummary(patientId);
  };

  // Open checkup completion modal
  const handleOpenCheckupModal = (app: AppointmentItem) => {
    setSelectedAppointment(app);
    setCompletionDate(new Date().toISOString().split('T')[0]);
    setClinicalNotes('Patient checkup and vital signs verified. General condition stable.');
    setTestResultsSummary('Routine blood profile and blood pressure within normal limits.');
    setDoctorSignature(`Dr. ${doctorName.replace(/^Dr\.\s*/i, '')}, M.D. - Verified Digital Signature`);
    setCheckupSuccessMsg('');
  };

  // Submit checkup completion
  const handleCompleteCheckup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    setIsSubmittingCheckup(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: selectedAppointment._id,
          status: 'completed',
          completionDate,
          clinicalNotes,
          testResultsSummary,
          doctorSignature,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCheckupSuccessMsg('Checkup marked as completed with doctor signature!');
        setTimeout(() => {
          setSelectedAppointment(null);
          fetchAppointments();
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Failed to complete checkup');
      }
    } catch (err) {
      setErrorMsg('Network error while completing checkup.');
    } finally {
      setIsSubmittingCheckup(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 bg-white/60 backdrop-blur-xl border border-white rounded-3xl p-10 max-w-5xl mx-auto my-8 shadow-sm">
        <div className="h-10 w-10 border-4 border-[#2ab8d8]/30 border-t-[#2ab8d8] rounded-full animate-spin" />
        <p className="text-[#003893] text-sm font-black animate-pulse">Loading Doctor Portal...</p>
      </div>
    );
  }

  // Role Guard View
  if (userRole !== 'doctor' && userRole !== 'admin') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white/80 backdrop-blur-xl border border-red-100 rounded-3xl shadow-lg text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto text-2xl">
          🚫
        </div>
        <h2 className="text-xl font-extrabold text-[#003893]">Doctor Access Restricted</h2>
        <p className="text-xs text-gray-500 font-medium leading-relaxed">
          Your account is currently registered as a <b>Patient</b> account. The doctor pre-consultation summary dashboard is accessible only to authorized medical providers.
        </p>
        <p className="text-xs text-gray-400 font-bold leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">
          Please contact the primary system administrator at <span className="text-[#003893] font-extrabold">heallink.care@gmail.com</span> to request doctor portal credentials.
        </p>

        <div className="pt-2 flex justify-center">
          <button
            onClick={() => router.push('/dashboard/patient')}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-2xl transition"
          >
            Go to Patient Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2 pb-16">
      {/* Doctor Header */}
      <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-[#003893] to-[#2ab8d8] rounded-2xl flex items-center justify-center text-white text-2xl shadow-md">
            🩺
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-[#003893] tracking-tight">MediFlow Doctor Portal</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                Doctor Mode
              </span>
            </div>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">
              Pre-consultation AI Summary, Appointment Queue &amp; Doctor Signatures
            </p>
          </div>
        </div>

        {/* Doctor Actions */}
        <div className="flex items-center gap-2">
          {selectedPatientId && (
            <button
              onClick={() => {
                setSelectedPatientId(null);
                setSummaryData(null);
              }}
              className="px-4 py-2 text-xs font-bold bg-white text-[#003893] border border-gray-200 rounded-2xl shadow-sm hover:bg-gray-50 transition flex items-center gap-1.5"
            >
              ⬅️ All Patients
            </button>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition border border-gray-200"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Real-Time Appointment Notification Alert Banner */}
      {appointments.filter((a) => a.status === 'pending').length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
              <span className="text-lg animate-bounce">🔔</span>
              <span>
                New Patient Appointment Notifications ({appointments.filter((a) => a.status === 'pending').length} Pending)
              </span>
            </div>
            <button
              onClick={() => setActiveTab('appointments')}
              className="px-3 py-1 bg-amber-600 text-white rounded-xl text-[10px] font-extrabold shadow hover:bg-amber-700 transition"
            >
              View Appointment Queue ➡️
            </button>
          </div>
          <div className="space-y-2">
            {appointments
              .filter((a) => a.status === 'pending')
              .slice(0, 3)
              .map((app) => (
                <div
                  key={app._id}
                  className="bg-white/90 p-3 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#003893]">
                      👤 {app.patientName || `Patient (${app.patientId.slice(0, 6)})`}
                    </span>
                    <span className="text-gray-500">booked an appointment for</span>
                    <span className="font-bold text-amber-800">{app.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-extrabold text-gray-600">
                    <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">🗓️ {app.date} @ {app.time}</span>
                    <button
                      onClick={() => handleOpenCheckupModal(app)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg transition"
                    >
                      Complete Checkup 🩺
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-lg">⚠️</span>
          <p className="text-xs text-red-700 font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Doctor Dashboard Navigation Tabs */}
      {!selectedPatientId && (
        <div className="flex bg-white/80 backdrop-blur-xl border border-white p-1 rounded-2xl shadow-sm max-w-md">
          <button
            onClick={() => setActiveTab('patients')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition duration-200 ${
              activeTab === 'patients'
                ? 'bg-[#003893] text-white shadow-sm'
                : 'text-gray-500 hover:text-[#003893]'
            }`}
          >
            👥 Patient Summaries ({patients.length})
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition duration-200 ${
              activeTab === 'appointments'
                ? 'bg-[#003893] text-white shadow-sm'
                : 'text-gray-500 hover:text-[#003893]'
            }`}
          >
            📅 Appointments Queue ({appointments.length})
          </button>
        </div>
      )}

      {/* Main Doctor Screen */}
      {!selectedPatientId ? (
        activeTab === 'patients' ? (
          /* Patient Search & Selection Screen */
          <div className="space-y-4">
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#003893]">Select a Patient for Pre-Consultation Summary</h2>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  Pick a patient to view their AI summary, medications, and flagged safety alerts.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchPatients(e.target.value);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-gray-50/80 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                />
                <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
              </div>
            </div>

            {/* Patient Grid */}
            {isLoadingPatients ? (
              <div className="py-12 text-center space-y-3">
                <div className="h-8 w-8 border-3 border-[#2ab8d8]/30 border-t-[#2ab8d8] rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-400 font-semibold">Searching patient records in MongoDB...</p>
              </div>
            ) : patients.length === 0 ? (
              <div className="py-12 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-2xl mb-2">👤</p>
                <p className="text-xs font-bold text-gray-600">No patients found</p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">Try clearing your search query or uploading patient documents.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient.id)}
                    className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-[#2ab8d8] cursor-pointer transition-all duration-200 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 text-[#003893] font-black flex items-center justify-center text-sm shadow-sm">
                          {patient.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-[#003893] leading-tight">{patient.name}</h3>
                          <p className="text-[10px] text-gray-400 font-semibold truncate max-w-[170px]">{patient.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[10px] font-extrabold">
                      <span className="text-gray-500">📄 {patient.documentCount} document(s)</span>
                      {patient.alertCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 animate-pulse">
                          ⚠️ {patient.alertCount} Alert(s)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          ✅ Clear
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Appointments Queue Screen */
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#003893]">Patient Appointments Queue &amp; Clinical Completion</h2>
                <p className="text-xs text-gray-400 font-medium">
                  Review booked appointments, record clinical notes, and sign off checkups upon patient visit completion.
                </p>
              </div>
              <button
                onClick={fetchAppointments}
                disabled={isLoadingAppointments}
                className="px-3.5 py-2 text-xs font-bold text-[#003893] bg-[#003893]/10 hover:bg-[#003893]/20 rounded-2xl transition border border-[#003893]/20 self-start sm:self-auto"
              >
                {isLoadingAppointments ? 'Refreshing Queue...' : '🔄 Refresh Queue'}
              </button>
            </div>

            {isLoadingAppointments ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100/80 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 font-medium bg-white/50 rounded-2xl border border-dashed border-gray-200">
                No appointments currently assigned or scheduled.
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((app) => {
                  const isCompleted = app.status === 'completed';
                  return (
                    <div
                      key={app._id}
                      className="p-5 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xs ${
                            isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isCompleted ? '✅' : '🩺'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-[#003893]">
                                Patient: {app.patientName || `User ID: ${app.patientId.slice(0, 8)}`}
                              </h3>
                              <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-lg capitalize ${
                                app.urgency === 'urgent'
                                  ? 'bg-red-100 text-red-700 border border-red-200'
                                  : app.urgency === 'soon'
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}>
                                {app.urgency} urgency
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-semibold mt-0.5">
                              Dept: <span className="text-gray-800">{app.department}</span> | Doctor: <span className="text-[#003893]">{app.doctorName}</span>
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-extrabold text-gray-500">
                              <span className="bg-gray-100 px-2.5 py-1 rounded-lg">🗓️ Date: {app.date}</span>
                              <span className="bg-gray-100 px-2.5 py-1 rounded-lg">🕒 Time: {app.time}</span>
                              {app.patientEmail && <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg">✉️ {app.patientEmail}</span>}
                              {app.patientPhone && <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg">📞 {app.patientPhone}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-start sm:items-end justify-between gap-2 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                          <span className={`px-3 py-1 text-xs font-black rounded-xl capitalize ${
                            isCompleted
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-amber-500 text-white shadow-xs'
                          }`}>
                            {app.status}
                          </span>
                          {!isCompleted ? (
                            <button
                              onClick={() => handleOpenCheckupModal(app)}
                              className="px-3.5 py-2 bg-[#2ab8d8] hover:bg-[#1fa1bf] text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1.5"
                            >
                              Complete Checkup 🩺
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                              Checkup Signed &amp; Finalized
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display Completed Certificate preview if completed */}
                      {isCompleted && app.completedDetails && (
                        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-950">
                          <div className="flex items-center justify-between text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                            <span>Clinical Checkup Details</span>
                            <span>Signed on: {app.completedDetails.completionDate}</span>
                          </div>
                          <p className="font-semibold text-emerald-900">{app.completedDetails.clinicalNotes}</p>
                          {app.completedDetails.testResultsSummary && (
                            <p className="text-[11px] text-emerald-800 italic">Tests: {app.completedDetails.testResultsSummary}</p>
                          )}
                          <div className="pt-1.5 text-right font-mono text-[11px] font-black text-emerald-800 border-t border-emerald-200/50">
                            Doctor Signature: <span className="bg-white px-2 py-0.5 rounded border border-emerald-300">✍️ {app.completedDetails.doctorSignature}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )
      ) : (
        /* Selected Patient View — AI Pre-Consultation Summary + Alerts + Timeline */
        <div className="space-y-6">
          {isLoadingSummary ? (
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-12 text-center space-y-4 shadow-sm">
              <div className="h-10 w-10 border-4 border-[#2ab8d8]/30 border-t-[#2ab8d8] rounded-full animate-spin mx-auto" />
              <h3 className="text-sm font-black text-[#003893] animate-pulse">Generating AI Pre-Consultation Summary...</h3>
              <p className="text-xs text-gray-400 font-medium">Analyzing timeline documents, active prescriptions &amp; clinical alerts via Gemini API.</p>
            </div>
          ) : (
            <>
              {/* TOP DISPLAY: AI Pre-Consultation Summary (4-5 lines plain English) */}
              <div className="bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-blue-600/10 border border-[#2ab8d8]/40 rounded-3xl p-6 shadow-md backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    <h2 className="text-sm font-black uppercase tracking-wider text-[#003893]">
                      AI Pre-Consultation Summary (Gemini Clinical Brief)
                    </h2>
                  </div>
                  <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-[#003893] text-white">
                    Patient: {summaryData?.patient?.name}
                  </span>
                </div>

                <div className="bg-white/90 border border-sky-100 rounded-2xl p-4 shadow-inner text-xs font-semibold text-gray-800 leading-relaxed whitespace-pre-line space-y-2">
                  <p>{summaryData?.summary}</p>
                  <p className="text-[10px] text-gray-400 font-medium italic border-t border-sky-100/60 pt-2 text-center">
                    This is AI generated based on its knowledge, it may show mistakes. Please verify with appropriate doctors before making any decisions.
                  </p>
                </div>
              </div>

              {/* MIDDLE ROW: Active Alerts & Active Medications */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Active Alerts List (Module A Collection) */}
                <div className="md:col-span-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#003893] flex items-center gap-1.5">
                      ⚠️ Active Safety Alerts ({summaryData?.alerts?.length || 0})
                    </h3>
                  </div>

                  {!summaryData?.alerts || summaryData.alerts.length === 0 ? (
                    <div className="bg-white/70 border border-gray-100 rounded-3xl p-6 text-center text-xs font-medium text-gray-400">
                      ✅ No duplicate, conflict, or missed follow-up alerts flagged for this patient.
                    </div>
                  ) : (
                    summaryData.alerts.map((alert, idx) => {
                      const isHigh = alert.severity === 'high';
                      const isMed = alert.severity === 'medium';
                      return (
                        <div
                          key={alert._id || idx}
                          className={`p-4 rounded-3xl border shadow-sm space-y-1.5 ${
                            isHigh
                              ? 'bg-red-50/80 border-red-200 text-red-900'
                              : isMed
                              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                              : 'bg-blue-50/80 border-blue-200 text-blue-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-white/80 border border-current">
                              {alert.type}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                isHigh
                                  ? 'bg-red-600 text-white'
                                  : isMed
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              {alert.severity} Severity
                            </span>
                          </div>
                          <p className="text-xs font-extrabold leading-snug">{alert.message}</p>
                          {alert.related_medication_or_document_id && (
                            <p className="text-[10px] opacity-80 font-semibold">
                              Linked Ref: {alert.related_medication_or_document_id}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Active Medications List */}
                <div className="md:col-span-6 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#003893] flex items-center gap-1.5">
                    💊 Active Prescribed Medications ({summaryData?.medications?.length || 0})
                  </h3>

                  {!summaryData?.medications || summaryData.medications.length === 0 ? (
                    <div className="bg-white/70 border border-gray-100 rounded-3xl p-6 text-center text-xs font-medium text-gray-400">
                      No active medications recorded in documents.
                    </div>
                  ) : (
                    <div className="bg-white/80 border border-white rounded-3xl p-4 shadow-sm space-y-2 max-h-[320px] overflow-y-auto">
                      {summaryData.medications.map((med, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-2xl bg-sky-50/60 border border-sky-100 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#003893]">{med.name}</span>
                            {med.dosage && (
                              <span className="ml-2 text-gray-500 font-semibold">({med.dosage})</span>
                            )}
                          </div>
                          {med.frequency && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-white text-[#2ab8d8] border border-sky-200">
                              {med.frequency}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM DISPLAY: Raw Medical Timeline (Document Collection) */}
              <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#003893] flex items-center gap-1.5">
                  📜 Raw Patient Medical History Timeline ({summaryData?.timeline?.length || 0})
                </h3>

                {!summaryData?.timeline || summaryData.timeline.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 font-medium">
                    No medical document records uploaded for this patient.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {summaryData.timeline.map((doc, idx) => {
                      const ext = doc.extractedData;
                      const dateStr = ext?.date
                        ? new Date(ext.date).toLocaleDateString()
                        : doc.createdAt
                        ? new Date(doc.createdAt).toLocaleDateString()
                        : 'Date N/A';

                      return (
                        <div
                          key={doc._id || doc.id || idx}
                          className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 hover:bg-white hover:shadow-sm transition-all space-y-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-lg bg-[#003893] text-white font-extrabold text-[10px] uppercase">
                                {ext?.document_type || doc.fileType}
                              </span>
                              <span className="font-extrabold text-[#003893]">{doc.fileName}</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400">📅 {dateStr}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-gray-600 font-medium pt-1">
                            <div>
                              <span className="text-gray-400 text-[10px] font-extrabold uppercase block">Diagnosis</span>
                              <span className="font-bold text-gray-800">{ext?.diagnosis || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 text-[10px] font-extrabold uppercase block">Doctor / Clinic</span>
                              <span className="font-bold text-gray-800">{ext?.doctor_name || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 text-[10px] font-extrabold uppercase block">Follow-up Date</span>
                              <span className="font-bold text-gray-800">
                                {ext?.follow_up_date ? new Date(ext.follow_up_date).toLocaleDateString() : 'None'}
                              </span>
                            </div>
                          </div>

                          {ext?.notes && (
                            <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-[11px] text-gray-600 italic">
                              "{ext.notes}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Doctor Checkup & Signature Completion Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🩺</span>
                <div>
                  <h3 className="text-base font-black text-[#003893]">Doctor Clinical Visit Sign-Off</h3>
                  <p className="text-[10px] text-gray-400 font-bold">
                    Mark visit completed for {selectedAppointment.patientName || 'Patient'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {checkupSuccessMsg ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <p className="text-sm font-black text-emerald-800">{checkupSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleCompleteCheckup} className="space-y-4">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block mb-1">
                    Checkup Date
                  </label>
                  <input
                    type="date"
                    required
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="w-full p-3 text-xs font-semibold text-[#003893] bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block mb-1">
                    Clinical Notes &amp; Observations
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Enter clinical examination notes, recommendations, and status..."
                    className="w-full p-3 text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block mb-1">
                    Test / Lab Results Summary (Optional)
                  </label>
                  <input
                    type="text"
                    value={testResultsSummary}
                    onChange={(e) => setTestResultsSummary(e.target.value)}
                    placeholder="e.g. ECG normal, Blood glucose 95 mg/dL"
                    className="w-full p-3 text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block mb-1">
                    Doctor Digital Signature
                  </label>
                  <input
                    type="text"
                    required
                    value={doctorSignature}
                    onChange={(e) => setDoctorSignature(e.target.value)}
                    placeholder="Dr. Full Name, M.D. - Digital Signature"
                    className="w-full p-3 text-xs font-mono font-bold text-emerald-800 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAppointment(null)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-2xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCheckup}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-md transition disabled:bg-gray-300"
                  >
                    {isSubmittingCheckup ? 'Signing Checkup...' : 'Sign & Complete Checkup ✍️'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
