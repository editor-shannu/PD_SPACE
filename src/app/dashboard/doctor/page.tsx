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
  const [activeTab, setActiveTab] = useState<'patients' | 'appointments' | 'consultation_logs' | 'referrals'>('patients');

  // Doctor Patient Referral State
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [isReferModalOpen, setIsReferModalOpen] = useState(false);
  const [referringPatient, setReferringPatient] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [targetDoctorId, setTargetDoctorId] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [referralNotes, setReferralNotes] = useState('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
  const [referralSuccessMsg, setReferralSuccessMsg] = useState('');
  const [referralErrorMsg, setReferralErrorMsg] = useState('');

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
    pastConsultations?: AppointmentItem[];
  } | null>(null);

  // Doctor Verification / Application State
  const [appStatus, setAppStatus] = useState<'loading' | 'none' | 'pending' | 'approved' | 'rejected'>('loading');
  const [appProfile, setAppProfile] = useState<any>(null);
  const [isCoolingActive, setIsCoolingActive] = useState(false);
  const [coolingDaysRemaining, setCoolingDaysRemaining] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isExistingPatient, setIsExistingPatient] = useState(false);

  // Verification Form Inputs
  const [docName, setDocName] = useState('');
  const [docDept, setDocDept] = useState('General Medicine');
  const [docLicense, setDocLicense] = useState('');
  const [docHospital, setDocHospital] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docExp, setDocExp] = useState('5');
  const [docQuals, setDocQuals] = useState('MBBS, MD');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [appFormError, setAppFormError] = useState('');
  const [appSuccessMsg, setAppSuccessMsg] = useState('');

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

  // Submit doctor verification application
  const handleSubmitDoctorApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppFormError('');
    setAppSuccessMsg('');
    setIsSubmittingApp(true);
    try {
      const res = await fetch('/api/doctor/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: docName || session?.user?.name,
          department: docDept,
          licenseNumber: docLicense,
          hospitalAffiliation: docHospital,
          phone: docPhone,
          experienceYears: docExp,
          qualifications: docQuals,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppStatus('pending');
        setAppProfile(data.doctorProfile);
        setAppSuccessMsg('Application submitted! Your profile is now under administrative review.');
      } else {
        setAppFormError(data.error || 'Failed to submit doctor verification application.');
      }
    } catch (err: any) {
      console.error(err);
      setAppFormError('Network error while submitting application.');
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Check Doctor Application Status
  const checkDoctorApplicationStatus = useCallback(async () => {
    try {
      setAppStatus('loading');
      const res = await fetch('/api/doctor/apply');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAppStatus(data.status);
          setAppProfile(data.doctorProfile);
          setIsCoolingActive(!!data.isCoolingActive);
          setCoolingDaysRemaining(data.coolingDaysRemaining || 0);
          setRejectionReason(data.doctorRejectionReason || '');
          setIsExistingPatient(!!data.isExistingPatient);
          if (data.status === 'approved' || data.role === 'doctor' || data.role === 'admin' || userRole === 'admin') {
            fetchPatients('');
            fetchAppointments();
          }
        }
      }
    } catch (err) {
      console.error('Check doctor application status error:', err);
    }
  }, [userRole, fetchPatients, fetchAppointments]);

  // Fetch available doctors for referral
  const fetchAvailableDoctors = useCallback(async () => {
    try {
      const res = await fetch('/api/doctors');
      if (res.ok) {
        const data = await res.json();
        setAvailableDoctors(data.doctors || []);
      }
    } catch (err) {
      console.error('Error fetching doctors for referral:', err);
    }
  }, []);

  // Fetch referrals list
  const fetchReferrals = useCallback(async () => {
    try {
      const res = await fetch('/api/doctor/refer');
      if (res.ok) {
        const data = await res.json();
        setReferralsList(data.referrals || []);
      }
    } catch (err) {
      console.error('Error fetching referrals:', err);
    }
  }, []);

  // Open refer modal for patient
  const handleOpenReferModal = (patient: { id: string; name: string; email?: string }) => {
    setReferringPatient(patient);
    setTargetDoctorId('');
    setReferralReason('');
    setReferralNotes('');
    setReferralSuccessMsg('');
    setReferralErrorMsg('');
    setIsReferModalOpen(true);
    fetchAvailableDoctors();
  };

  // Submit patient referral
  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referringPatient || !targetDoctorId || !referralReason) {
      setReferralErrorMsg('Please select a target doctor and provide a referral reason.');
      return;
    }
    setIsSubmittingReferral(true);
    setReferralErrorMsg('');
    setReferralSuccessMsg('');

    try {
      const res = await fetch('/api/doctor/refer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: referringPatient.id,
          toDoctorId: targetDoctorId,
          reason: referralReason,
          clinicalNotes: referralNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReferralSuccessMsg(data.message || 'Patient referral submitted successfully!');
        fetchReferrals();
        fetchPatients(searchQuery);
        fetchAppointments();
        setTimeout(() => {
          setIsReferModalOpen(false);
        }, 1800);
      } else {
        setReferralErrorMsg(data.error || 'Failed to submit referral.');
      }
    } catch (err) {
      console.error(err);
      setReferralErrorMsg('Network error while submitting referral.');
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (status === 'authenticated') {
      const email = session?.user?.email?.toLowerCase().trim();
      setDocName(session?.user?.name || '');
      fetchAvailableDoctors();
      fetchReferrals();
      if (email === 'heallink.care@gmail.com' || email === 'mediflow@test.com' || userRole === 'admin') {
        setAppStatus('approved');
        fetchPatients('');
        fetchAppointments();
      } else {
        checkDoctorApplicationStatus();
      }
    }
  }, [status, session, userRole, checkDoctorApplicationStatus, fetchPatients, fetchAppointments, fetchAvailableDoctors, fetchReferrals]);

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

  if (status === 'loading' || appStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 bg-white/60 backdrop-blur-xl border border-white rounded-3xl p-10 max-w-5xl mx-auto my-8 shadow-sm">
        <div className="h-10 w-10 border-4 border-[#2ab8d8]/30 border-t-[#2ab8d8] rounded-full animate-spin" />
        <p className="text-[#003893] text-sm font-black animate-pulse">Verifying Doctor Credentials &amp; Access Permissions...</p>
      </div>
    );
  }

  // 0. Existing Patient Account Access Restriction View
  if (isExistingPatient && appStatus !== 'approved' && userRole !== 'admin') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white/90 backdrop-blur-2xl border border-red-100 rounded-3xl shadow-xl text-center space-y-5">
        <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-sm">
          🚫
        </div>
        <div className="space-y-1.5">
          <span className="px-3 py-1 bg-red-100 text-red-800 text-[10px] font-black uppercase rounded-full border border-red-200">
            Access Restricted
          </span>
          <h2 className="text-xl font-black text-[#003893]">Patient Account Detected</h2>
        </div>
        <p className="text-xs text-gray-600 font-semibold leading-relaxed max-w-md mx-auto">
          An account registered as a <b>Patient</b> in MediFlow cannot use, sign in, or access the Doctor Portal.
        </p>
        <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-150 text-left text-xs font-semibold text-gray-500 space-y-1.5">
          <p className="font-extrabold text-gray-700">Account Details:</p>
          <p>• Email: <span className="font-bold text-gray-800">{session?.user?.email}</span></p>
          <p>• Registered Role: <span className="font-bold text-sky-800 uppercase">Patient</span></p>
          <p className="text-[11px] text-gray-400 mt-2">
            If you are a medical provider, please register using a dedicated professional email address or contact support at <b className="text-[#003893]">heallink.care@gmail.com</b>.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <button
            onClick={() => router.push('/dashboard/patient')}
            className="px-6 py-3 bg-[#003893] hover:bg-[#002868] text-white text-xs font-extrabold rounded-2xl transition shadow-md"
          >
            Go to Patient Dashboard →
          </button>
        </div>
      </div>
    );
  }

  // 1. Doctor Registration & Verification Form View (When application status is 'none')
  if (appStatus === 'none' && userRole !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto my-8 p-8 bg-white/90 backdrop-blur-2xl border border-white rounded-3xl shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#003893] to-[#2ab8d8] text-white font-black flex items-center justify-center text-2xl shadow-md">
            🩺
          </div>
          <div>
            <h2 className="text-xl font-black text-[#003893]">Doctor Registration &amp; Verification Form</h2>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">
              Submit your medical credentials for Admin verification to unlock Doctor Portal access.
            </p>
          </div>
        </div>

        {appFormError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{appFormError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitDoctorApp} className="space-y-4 text-xs font-bold text-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 mb-1">Full Legal / Professional Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Dr. Full Name"
                className="w-full p-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#2ab8d8] outline-none transition font-semibold text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1">Department / Specialty <span className="text-red-500">*</span></label>
              <select
                value={docDept}
                onChange={(e) => setDocDept(e.target.value)}
                className="w-full p-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#2ab8d8] outline-none transition font-semibold text-xs"
              >
                <option value="General Medicine">General Medicine</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Psychiatry">Psychiatry</option>
                <option value="Oncology">Oncology</option>
                <option value="Surgery">Surgery</option>
                <option value="Gynecology">Gynecology</option>
                <option value="Emergency Medicine">Emergency Medicine</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 mb-1">Medical License Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={docLicense}
                onChange={(e) => setDocLicense(e.target.value)}
                placeholder="e.g. MED-894721"
                className="w-full p-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#2ab8d8] outline-none transition font-semibold text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1">Hospital / Clinic Affiliation <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={docHospital}
                onChange={(e) => setDocHospital(e.target.value)}
                placeholder="e.g. City General Hospital"
                className="w-full p-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#2ab8d8] outline-none transition font-semibold text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 mb-1">Contact Phone Number <span className="text-red-500">*</span></label>
              <input
                type="tel"
                required
                value={docPhone}
                onChange={(e) => setDocPhone(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full p-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#2ab8d8] outline-none transition font-semibold text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1">Years of Clinical Experience</label>
              <input
                type="text"
                value={docExp}
                onChange={(e) => setDocExp(e.target.value)}
                placeholder="e.g. 5 years"
                className="w-full p-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#2ab8d8] outline-none transition font-semibold text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Qualifications &amp; Degrees</label>
            <input
              type="text"
              value={docQuals}
              onChange={(e) => setDocQuals(e.target.value)}
              placeholder="e.g. MBBS, MD (Internal Medicine), FACP"
              className="w-full p-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#2ab8d8] outline-none transition font-semibold text-xs"
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.push('/dashboard/patient')}
              className="px-5 py-2.5 rounded-2xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition"
            >
              Cancel &amp; Go to Patient Portal
            </button>
            <button
              type="submit"
              disabled={isSubmittingApp}
              className="px-6 py-3 rounded-2xl bg-[#003893] text-white font-extrabold shadow-lg hover:bg-[#002868] transition disabled:opacity-50"
            >
              {isSubmittingApp ? 'Submitting Application...' : 'Submit Verification Form →'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // 2. Application Pending View (Under Review)
  if (appStatus === 'pending' && userRole !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-amber-50/80 backdrop-blur-2xl border border-amber-200 rounded-3xl shadow-xl space-y-6 text-center">
        <div className="w-16 h-16 bg-amber-100 border border-amber-300 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-sm animate-pulse">
          ⏳
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-amber-200 text-amber-900 text-[10px] font-black uppercase rounded-full border border-amber-300">
            Under Administrative Review
          </span>
          <h2 className="text-2xl font-black text-[#003893]">Doctor Application Submitted</h2>
          <p className="text-xs text-amber-900 font-semibold leading-relaxed max-w-lg mx-auto">
            Your medical verification application has been received. MediFlow Administrators are verifying your license number and clinical credentials.
          </p>
        </div>

        {appProfile && (
          <div className="bg-white/90 border border-amber-200 rounded-2xl p-5 text-left text-xs font-semibold text-gray-700 space-y-2 shadow-inner">
            <h4 className="font-extrabold text-[#003893] uppercase text-[10px] tracking-wider border-b border-amber-100 pb-1">
              Submitted Verification Profile Details
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <p><span className="text-gray-400">Department:</span> <b>{appProfile.department}</b></p>
              <p><span className="text-gray-400">License #:</span> <b className="font-mono">{appProfile.licenseNumber}</b></p>
              <p><span className="text-gray-400">Hospital:</span> <b>{appProfile.hospitalAffiliation}</b></p>
              <p><span className="text-gray-400">Phone:</span> <b>{appProfile.phone}</b></p>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => checkDoctorApplicationStatus()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#003893] text-white font-extrabold text-xs hover:bg-[#002868] shadow-md transition"
          >
            🔄 Refresh Status
          </button>
          <button
            onClick={() => router.push('/dashboard/patient')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-white border border-amber-300 text-amber-900 font-extrabold text-xs hover:bg-amber-100 transition"
          >
            Go to Patient Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 3. Application Rejected View (With 1-Week Cooling Period)
  if (appStatus === 'rejected' && userRole !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-red-50/90 backdrop-blur-2xl border border-red-200 rounded-3xl shadow-xl space-y-6 text-center">
        <div className="w-16 h-16 bg-red-100 border border-red-300 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-sm">
          ❌
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-red-200 text-red-900 text-[10px] font-black uppercase rounded-full border border-red-300">
            Application Rejected
          </span>
          <h2 className="text-2xl font-black text-red-950">Verification Application Not Approved</h2>
          <p className="text-xs text-red-900 font-semibold leading-relaxed max-w-lg mx-auto">
            {rejectionReason || 'Your doctor verification application was not approved by the MediFlow Administrator.'}
          </p>
        </div>

        {/* 1-WEEK COOLING PERIOD CARD */}
        <div className="bg-white/90 border border-red-200 rounded-2xl p-6 shadow-inner space-y-3">
          <div className="flex items-center justify-center gap-2 text-red-900 font-black text-sm">
            <span>⏱️</span>
            <span>Mandatory 1-Week Cooling Period</span>
          </div>

          {isCoolingActive ? (
            <div className="space-y-2 text-xs font-semibold text-gray-700">
              <p>
                To maintain healthcare compliance, a 7-day waiting period is enforced before you may re-submit a doctor application.
              </p>
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-900 font-bold text-center">
                ⏳ Days remaining until re-application unlocks: <span className="text-base font-black text-red-600">{coolingDaysRemaining} Day(s)</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs font-semibold text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <p className="font-extrabold">✅ Your 1-week cooling period has expired!</p>
              <p className="text-emerald-700">You may now re-submit your updated doctor verification form for admin review.</p>
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {!isCoolingActive ? (
            <button
              onClick={() => setAppStatus('none')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#003893] text-white font-extrabold text-xs hover:bg-[#002868] shadow-lg transition"
            >
              📝 Re-Apply for Doctor Access Now →
            </button>
          ) : (
            <button
              disabled
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gray-200 text-gray-400 font-extrabold text-xs border border-gray-300 cursor-not-allowed"
            >
              🔒 Re-Apply Locked ({coolingDaysRemaining} days remaining)
            </button>
          )}

          <button
            onClick={() => router.push('/dashboard/patient')}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-extrabold text-xs hover:bg-gray-50 transition"
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
        <div className="flex bg-white/80 backdrop-blur-xl border border-white p-1 rounded-2xl shadow-sm max-w-2xl">
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
            📅 Appointments Queue ({appointments.filter((a) => a.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('consultation_logs')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition duration-200 ${
              activeTab === 'consultation_logs'
                ? 'bg-[#003893] text-white shadow-sm'
                : 'text-gray-500 hover:text-[#003893]'
            }`}
          >
            📜 Consulted Logs ({appointments.filter((a) => a.status === 'completed').length})
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition duration-200 ${
              activeTab === 'referrals'
                ? 'bg-[#003893] text-white shadow-sm'
                : 'text-gray-500 hover:text-[#003893]'
            }`}
          >
            🔄 Referrals Log ({referralsList.length})
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReferModal({ id: patient.id, name: patient.name, email: patient.email });
                        }}
                        className="px-2.5 py-1 text-[10px] font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1 shadow-xs"
                        title="Refer patient to another doctor"
                      >
                        Refer 🔄
                      </button>
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
      ) : activeTab === 'appointments' ? (
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
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenReferModal({ id: app.patientId, name: app.patientName || 'Patient', email: app.patientEmail })}
                                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold transition flex items-center gap-1 shadow-xs"
                                title="Refer patient to another doctor"
                              >
                                Refer 🔄
                              </button>
                              <button
                                onClick={() => handleOpenCheckupModal(app)}
                                className="px-3.5 py-2 bg-[#2ab8d8] hover:bg-[#1fa1bf] text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1.5"
                              >
                                Complete Checkup 🩺
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenReferModal({ id: app.patientId, name: app.patientName || 'Patient', email: app.patientEmail })}
                                className="px-2.5 py-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold transition flex items-center gap-1"
                              >
                                Refer 🔄
                              </button>
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                Checkup Signed &amp; Finalized
                              </span>
                            </div>
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
      ) : activeTab === 'consultation_logs' ? (
        /* Completed Consultation Logs View - restricted strictly to patients who consulted this doctor */
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#003893] flex items-center gap-2">
                  <span>📜</span> Patient Consultation &amp; EMR Records Log
                </h2>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  Restricted access: Showing finalized consultation logs for patients who booked with Dr. {session?.user?.name || 'Doctor'}.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black">
                {appointments.filter((a) => a.status === 'completed').length} Finalized Records
              </span>
            </div>

            {appointments.filter((a) => a.status === 'completed').length === 0 ? (
              <div className="p-12 text-center bg-emerald-50/40 rounded-2xl border border-dashed border-emerald-200 space-y-2">
                <span className="text-3xl">🩺</span>
                <h3 className="text-sm font-bold text-emerald-900">No Completed Consultations Yet</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  When patients select you and visit for their checkup, complete their appointment from the queue to generate signed consultation logs.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments
                  .filter((a) => a.status === 'completed')
                  .map((app) => (
                    <div
                      key={app._id}
                      className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-xs hover:shadow-md transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-black">
                            ✍️
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-[#003893]">
                              Patient: {app.patientName || `Patient (${app.patientId.slice(0, 6)})`}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium">
                              Dept: <span className="font-bold text-gray-700">{app.department}</span> | Email: <span className="font-semibold text-blue-700">{app.patientEmail || 'N/A'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-700">
                          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl">
                            ✅ Finalized on {app.completedDetails?.completionDate || app.date}
                          </span>
                        </div>
                      </div>

                      {/* Log details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Clinical Notes / Examination</span>
                          <p className="font-semibold text-gray-800">{app.completedDetails?.clinicalNotes || 'Checkup completed.'}</p>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Test Results &amp; Vitals Summary</span>
                          <p className="font-semibold text-gray-800">{app.completedDetails?.testResultsSummary || 'Vitals normal.'}</p>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-[11px] text-gray-500 font-semibold border-t border-gray-100">
                        <span>🗓️ Appt Date: {app.date} at {app.time}</span>
                        <span className="font-mono font-bold text-emerald-800">
                          Verified Signature: <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">✍️ {app.completedDetails?.doctorSignature || `${session?.user?.name || 'Doctor'}, M.D.`}</span>
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Patient Referrals Log Screen */
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#003893] flex items-center gap-2">
                  <span>🔄</span> Doctor-to-Doctor Patient Referrals Log
                </h2>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  Track cross-consultation patient referrals and clinical record sharing between registered doctors.
                </p>
              </div>
              <button
                onClick={fetchReferrals}
                className="px-3.5 py-2 text-xs font-bold text-[#003893] bg-[#003893]/10 hover:bg-[#003893]/20 rounded-2xl transition border border-[#003893]/20 self-start sm:self-auto"
              >
                🔄 Refresh Referrals
              </button>
            </div>

            {referralsList.length === 0 ? (
              <div className="p-12 text-center bg-indigo-50/40 rounded-2xl border border-dashed border-indigo-200 space-y-2">
                <span className="text-3xl">🔄</span>
                <h3 className="text-sm font-bold text-indigo-900">No Patient Referrals Recorded</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  When you or other doctors refer patients for specialized consultations, referral logs and shared data links will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {referralsList.map((ref: any) => {
                  const isIncoming = ref.toDoctorEmail === session?.user?.email || ref.toDoctorId === (session?.user as any)?.id;
                  return (
                    <div
                      key={ref._id}
                      className="p-5 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
                            isIncoming ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isIncoming ? '📥' : '📤'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-[#003893]">
                                Patient: {ref.patientName}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                                isIncoming ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-blue-100 text-blue-900 border border-blue-200'
                              }`}>
                                {isIncoming ? 'Incoming Referral' : 'Outgoing Referral'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">
                              From: <span className="font-bold text-gray-800">{ref.fromDoctorName}</span> ➡️ To: <span className="font-bold text-indigo-900">{ref.toDoctorName} ({ref.toDepartment})</span>
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] text-gray-400 font-semibold self-start sm:self-auto">
                          🗓️ {new Date(ref.createdAt).toLocaleDateString()} @ {new Date(ref.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                          <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider block">Reason for Clinical Referral</span>
                          <p className="font-bold text-indigo-950">{ref.reason}</p>
                        </div>

                        {ref.clinicalNotes && (
                          <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Doctor Notes</span>
                            <p className="font-semibold text-gray-700">{ref.clinicalNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )) : (
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    <h2 className="text-sm font-black uppercase tracking-wider text-[#003893]">
                      AI Pre-Consultation Summary (Gemini Clinical Brief)
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-[#003893] text-white">
                      Patient: {summaryData?.patient?.name}
                    </span>
                    {summaryData?.patient && (
                      <button
                        onClick={() => handleOpenReferModal({ id: summaryData.patient!.id, name: summaryData.patient!.name, email: summaryData.patient!.email })}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[10px] font-extrabold shadow-sm transition flex items-center gap-1"
                      >
                        Refer Patient 🔄
                      </button>
                    )}
                  </div>
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

              {/* PAST SIGNED CONSULTATION REPORTS */}
              <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#003893] flex items-center gap-1.5">
                    <span>🩺</span> Past Signed Consultation Reports ({summaryData?.pastConsultations?.length || 0})
                  </h3>
                  <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Verified Doctor Visit Records
                  </span>
                </div>

                {!summaryData?.pastConsultations || summaryData.pastConsultations.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 font-medium bg-emerald-50/30 rounded-2xl border border-dashed border-emerald-100">
                    No past signed checkup consultations recorded for this patient.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {summaryData.pastConsultations.map((app) => (
                      <div
                        key={app._id}
                        className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-base">
                              ✍️
                            </div>
                            <div>
                              <h4 className="text-xs font-extrabold text-[#003893]">
                                Consulting Physician: {app.doctorName}
                              </h4>
                              <p className="text-[10px] text-gray-500 font-semibold">
                                Department: <span className="text-gray-700 font-bold">{app.department}</span> | Appt Date: {app.date}
                              </p>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 bg-white text-emerald-800 border border-emerald-300 rounded-xl text-[10px] font-black self-start sm:self-auto">
                            ✅ Finalized on {app.completedDetails?.completionDate || app.date}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                            <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Clinical Notes / Examination</span>
                            <p className="font-semibold text-gray-800 leading-relaxed">{app.completedDetails?.clinicalNotes || 'Checkup completed.'}</p>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                            <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Test Results &amp; Vitals Summary</span>
                            <p className="font-semibold text-gray-800 leading-relaxed">{app.completedDetails?.testResultsSummary || 'Vitals normal.'}</p>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between text-[11px] text-emerald-900 font-semibold border-t border-emerald-200/60">
                          <span>Doctor Signature Verification:</span>
                          <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-900 font-bold">
                            ✍️ {app.completedDetails?.doctorSignature || `${app.doctorName}, M.D.`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Doctor-to-Doctor Patient Referral Modal */}
      {isReferModalOpen && referringPatient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔄</span>
                <div>
                  <h3 className="text-base font-black text-[#003893]">Refer Patient to Doctor Specialist</h3>
                  <p className="text-[10px] text-gray-400 font-bold">
                    Patient: <span className="text-[#003893]">{referringPatient.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReferModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {referralSuccessMsg ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <p className="text-sm font-black text-indigo-900">{referralSuccessMsg}</p>
                <p className="text-xs text-gray-500">Patient access and records have been shared with the selected doctor.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReferral} className="space-y-4">
                {referralErrorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                    ⚠️ {referralErrorMsg}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block mb-1">
                    Select Target Doctor / Specialist
                  </label>
                  <select
                    required
                    value={targetDoctorId}
                    onChange={(e) => setTargetDoctorId(e.target.value)}
                    className="w-full p-3 text-xs font-bold text-[#003893] bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003893]"
                  >
                    <option value="">-- Choose verified doctor --</option>
                    {availableDoctors
                      .filter((d: any) => d._id !== (session?.user as any)?.id && d.email !== session?.user?.email)
                      .map((doc: any) => (
                        <option key={doc._id} value={doc._id}>
                          Dr. {doc.name} — {doc.department || 'General Medicine'} ({doc.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block mb-1">
                    Reason for Referral
                  </label>
                  <input
                    type="text"
                    required
                    value={referralReason}
                    onChange={(e) => setReferralReason(e.target.value)}
                    placeholder="e.g. Cardiology consultation, second opinion, specialized surgery"
                    className="w-full p-3 text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003893]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block mb-1">
                    Clinical Notes &amp; Handover Brief (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={referralNotes}
                    onChange={(e) => setReferralNotes(e.target.value)}
                    placeholder="Share clinical history, relevant symptoms, or diagnostic findings for the receiving physician..."
                    className="w-full p-3 text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003893]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReferModalOpen(false)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-2xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReferral}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md transition disabled:bg-gray-300"
                  >
                    {isSubmittingReferral ? 'Sending Referral...' : 'Send Referral 🔄'}
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
