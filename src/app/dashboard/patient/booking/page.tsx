'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Recommendation {
  recommended_department: string;
  urgency_level: 'routine' | 'soon' | 'urgent';
  reasoning: string;
}

interface Appointment {
  _id?: string;
  id?: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  urgency: 'routine' | 'soon' | 'urgent';
  createdAt?: string;
}

const departments = [
  'General Medicine',
  'Cardiology',
  'Neurology',
  'Pediatrics',
  'Dermatology',
  'Orthopedics',
];

interface MockDoctor {
  name: string;
  slots: string[];
}

const mockDoctors: Record<string, MockDoctor[]> = {
  'General Medicine': [
    { name: 'Dr. Gregory House', slots: ['11:00 AM', '02:00 PM', '04:30 PM'] },
    { name: 'Dr. John Watson', slots: ['10:00 AM', '12:30 PM', '03:00 PM'] },
  ],
  'Cardiology': [
    { name: 'Dr. Sarah Jenkins', slots: ['09:00 AM', '11:30 AM', '02:00 PM'] },
    { name: 'Dr. Marcus Vance', slots: ['10:00 AM', '01:30 PM', '04:00 PM'] },
  ],
  'Neurology': [
    { name: 'Dr. Elena Rostova', slots: ['09:30 AM', '11:00 AM', '03:30 PM'] },
    { name: 'Dr. Raymond Holt', slots: ['10:30 AM', '02:30 PM', '05:00 PM'] },
  ],
  'Pediatrics': [
    { name: 'Dr. Lisa Cuddy', slots: ['08:30 AM', '10:30 AM', '01:00 PM'] },
  ],
  'Dermatology': [
    { name: 'Dr. Allison Cameron', slots: ['09:00 AM', '01:30 PM', '03:00 PM'] },
  ],
  'Orthopedics': [
    { name: 'Dr. Robert Chase', slots: ['09:00 AM', '11:00 AM', '02:30 PM'] },
  ],
};

function BookingFlow() {
  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');
  
  // Symptom Analysis states
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  // Booking Form states
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoc, setSelectedDoc] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'soon' | 'urgent'>('routine');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Appointment History states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const searchParams = useSearchParams();
  const facilityParam = searchParams.get('facility');
  const typeParam = searchParams.get('type');

  useEffect(() => {
    if (facilityParam) {
      // Map facility types to appropriate departments
      let mappedDept = 'General Medicine';
      if (typeParam === 'hospital') {
        mappedDept = 'General Medicine';
      } else if (typeParam === 'clinic') {
        mappedDept = 'General Medicine';
      } else if (typeParam === 'pharmacy') {
        mappedDept = 'General Medicine';
      }

      setSelectedDept(mappedDept);

      // Pre-fill first doctor of the department
      const docs = mockDoctors[mappedDept] || [];
      if (docs.length > 0) {
        setSelectedDoc(docs[0].name);
        if (docs[0].slots.length > 0) {
          setSelectedSlot(docs[0].slots[0]);
        }
      }

      setSymptoms(`Consultation regarding visit to nearby facility: ${facilityParam}.`);

      // Set booking date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setBookingDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [facilityParam, typeParam]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleAnalyzeSymptoms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setIsAnalyzing(true);
    setAnalysisError('');
    setRecommendation(null);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
      });

      const data = await res.json();
      if (data.success && data.recommendation) {
        const rec = data.recommendation as Recommendation;
        setRecommendation(rec);
        
        // Find match or fallback
        const matchedDept = departments.find(
          (d) => d.toLowerCase() === rec.recommended_department.toLowerCase()
        ) || 'General Medicine';

        setSelectedDept(matchedDept);
        setUrgency(rec.urgency_level || 'routine');

        // Pre-fill doctor
        const doctors = mockDoctors[matchedDept] || [];
        if (doctors.length > 0) {
          const doc = doctors[0];
          setSelectedDoc(doc.name);
          if (doc.slots.length > 0) {
            setSelectedSlot(doc.slots[0]);
          }
        } else {
          setSelectedDoc('');
          setSelectedSlot('');
        }

        // Pre-fill date to tomorrow (YYYY-MM-DD)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        setBookingDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setAnalysisError(data.error || 'Failed to analyze symptoms');
      }
    } catch (err) {
      setAnalysisError('Network error. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sync doctor slots when department changes manually
  const handleDeptChange = (dept: string) => {
    setSelectedDept(dept);
    const docs = mockDoctors[dept] || [];
    if (docs.length > 0) {
      const doc = docs[0];
      setSelectedDoc(doc.name);
      if (doc.slots.length > 0) {
        setSelectedSlot(doc.slots[0]);
      } else {
        setSelectedSlot('');
      }
    } else {
      setSelectedDoc('');
      setSelectedSlot('');
    }
  };

  // Sync slots when doctor changes manually
  const handleDocChange = (docName: string) => {
    setSelectedDoc(docName);
    const docs = mockDoctors[selectedDept] || [];
    const foundDoc = docs.find((d) => d.name === docName);
    if (foundDoc && foundDoc.slots.length > 0) {
      setSelectedSlot(foundDoc.slots[0]);
    } else {
      setSelectedSlot('');
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !selectedDoc || !selectedSlot || !bookingDate) {
      setBookingError('Please fill out all booking fields.');
      return;
    }

    setIsBooking(true);
    setBookingError('');

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorName: selectedDoc,
          department: selectedDept,
          date: bookingDate,
          time: selectedSlot,
          urgency,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBookingSuccess(true);
        // Clear form
        setSelectedDoc('');
        setSelectedSlot('');
        setBookingDate('');
        // Refresh history cache
        fetchHistory();
      } else {
        setBookingError(data.error || 'Failed to book appointment');
      }
    } catch (err) {
      setBookingError('Failed to save booking. Please check network connectivity.');
    } finally {
      setIsBooking(false);
    }
  };

  const getUrgencyBadgeColor = (level: 'routine' | 'soon' | 'urgent') => {
    if (level === 'urgent') return 'bg-red-500/10 text-red-500 border-red-500/30';
    if (level === 'soon') return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
  };

  const availableDoctors = selectedDept ? mockDoctors[selectedDept] || [] : [];
  const availableSlots = selectedDoc ? availableDoctors.find(d => d.name === selectedDoc)?.slots || [] : [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-1 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/patient"
          className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition text-[#2ab8d8]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#003893] tracking-tight">Specialist Bookings</h1>
          <p className="text-xs text-gray-400 font-semibold">Triage symptoms and schedule medical appointments</p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-white/60 backdrop-blur-xl border border-white/80 p-1 rounded-2xl shadow-sm">
        <button
          onClick={() => setActiveTab('book')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition duration-200 ${
            activeTab === 'book'
              ? 'bg-[#003893] text-white shadow-sm'
              : 'text-gray-500 hover:text-[#003893]'
          }`}
        >
          Book Appointment
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition duration-200 ${
            activeTab === 'history'
              ? 'bg-[#003893] text-white shadow-sm'
              : 'text-gray-500 hover:text-[#003893]'
          }`}
        >
          My Appointments
        </button>
      </div>

      {activeTab === 'book' ? (
        <div className="space-y-6">
          {/* Step 1: Symptom Analysis */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm">
            <span className="inline-block bg-[#2ab8d8]/15 text-[#2ab8d8] text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg mb-3">
              Step 1: Symptom Triage
            </span>
            <h2 className="text-base font-black text-[#003893] mb-1">AI Specialist Recommendation</h2>
            <p className="text-gray-400 text-xs mb-4">Describe your symptoms. We will analyze them alongside your medical history to suggest a specialist.</p>
            
            <form onSubmit={handleAnalyzeSymptoms} className="space-y-4">
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Describe how you feel (e.g., 'Have a sharp headache and nausea since yesterday morning...')"
                className="w-full h-24 p-4 text-sm text-[#003893] placeholder-gray-400 bg-white/80 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2ab8d8] resize-none"
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={isAnalyzing || !symptoms.trim()}
                className="w-full py-3 bg-[#003893] hover:bg-[#002b70] text-white rounded-2xl font-bold transition text-xs shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing symptoms & history...
                  </>
                ) : (
                  'Analyze & Recommend Department'
                )}
              </button>
            </form>

            {analysisError && (
              <div className="mt-4 p-3.5 bg-red-50 text-red-600 rounded-2xl text-xs border border-red-100">
                ⚠️ {analysisError}
              </div>
            )}

            {recommendation && (
              <div className="mt-6 p-5 bg-[#003893]/5 border border-[#003893]/10 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-wider">Recommended Specialist</span>
                    <span className="text-sm font-black text-[#003893]">{recommendation.recommended_department}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-xl text-[9px] font-extrabold capitalize ${getUrgencyBadgeColor(recommendation.urgency_level)}`}>
                    {recommendation.urgency_level === 'urgent' && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />}
                    {recommendation.urgency_level} urgency
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-wider mb-0.5">Clinical Reasoning</span>
                  <p className="text-xs text-gray-600 leading-relaxed">{recommendation.reasoning}</p>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Appointment Scheduler */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm">
            <span className="inline-block bg-[#6366f1]/15 text-[#6366f1] text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg mb-3">
              Step 2: Verification & Scheduling
            </span>
            <h2 className="text-base font-black text-[#003893] mb-1">Verify and Book Appointment</h2>
            <p className="text-gray-400 text-xs mb-4">
              {recommendation 
                ? "The recommended details have been prefilled. Please review, adjust, and click Confirm to book."
                : "Choose a department, doctor, and slot to schedule your consultation."}
            </p>

            {bookingSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#003893]">Booking Confirmed!</h3>
                  <p className="text-gray-400 text-xs mt-1">Your appointment has been successfully recorded.</p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={() => {
                      setBookingSuccess(false);
                      setRecommendation(null);
                      setSymptoms('');
                      setSelectedDept('');
                      setSelectedDoc('');
                      setSelectedSlot('');
                      setBookingDate('');
                    }}
                    className="px-4 py-2 bg-[#003893] text-white rounded-xl text-xs font-bold shadow hover:bg-[#002b70] transition"
                  >
                    Book Another
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:text-[#003893] transition"
                  >
                    View History
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookAppointment} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Department selector */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Department</label>
                    <select
                      value={selectedDept}
                      onChange={(e) => handleDeptChange(e.target.value)}
                      className="w-full p-3 text-xs font-semibold text-[#003893] bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  {/* Urgency */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Urgency</label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as any)}
                      className="w-full p-3 text-xs font-semibold text-[#003893] bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                    >
                      <option value="routine">Routine</option>
                      <option value="soon">Soon</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Doctor selector */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Available Doctor</label>
                    <select
                      value={selectedDoc}
                      onChange={(e) => handleDocChange(e.target.value)}
                      disabled={!selectedDept}
                      className="w-full p-3 text-xs font-semibold text-[#003893] bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ab8d8] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Doctor</option>
                      {availableDoctors.map((doc) => (
                        <option key={doc.name} value={doc.name}>{doc.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date selection */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Appointment Date</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-3 text-xs font-semibold text-[#003893] bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ab8d8]"
                    />
                  </div>
                </div>

                {/* Slots selection */}
                {selectedDoc && (
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Available Time Slots</label>
                    <div className="flex flex-wrap gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                            selectedSlot === slot
                              ? 'bg-[#2ab8d8] border-[#2ab8d8] text-white shadow-sm'
                              : 'bg-white border-gray-200 text-[#003893] hover:border-[#2ab8d8]/50'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {bookingError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl text-xs border border-red-100">
                    ⚠️ {bookingError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isBooking || !selectedDept || !selectedDoc || !selectedSlot || !bookingDate}
                  className="w-full py-3 bg-[#2ab8d8] hover:bg-[#1fa1bf] text-white rounded-2xl font-bold transition text-xs shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isBooking ? 'Saving Booking...' : 'Confirm & Book Appointment'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* History tab */
        <div className="space-y-4">
          {isLoadingHistory ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white/60 rounded-2xl h-24 animate-pulse border border-white/80" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-xl border border-dashed border-gray-200 rounded-3xl p-10 text-center shadow-sm">
              <div className="h-10 w-10 mx-auto bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-3">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm font-medium">No appointments scheduled.</p>
              <p className="text-gray-300 text-xs mt-1">Use the Book Appointment tab to schedule consultation.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {appointments.map((app) => (
                <div
                  key={app._id || app.id}
                  className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#003893]/5 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#003893] text-lg font-black">🩺</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#003893]">{app.doctorName}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{app.department} Department</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 uppercase">
                          🗓️ {app.date}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 uppercase">
                          🕒 {app.time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                    <span className="px-2.5 py-1 text-[10px] rounded-lg font-extrabold capitalize bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      {app.status}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[9px] rounded-lg border font-bold capitalize ${getUrgencyBadgeColor(app.urgency)}`}>
                      {app.urgency} urgency
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-10 w-10 border-4 border-[#2ab8d8]/30 border-t-[#2ab8d8] rounded-full animate-spin" />
        <p className="text-gray-400 text-xs font-semibold">Loading booking flow...</p>
      </div>
    }>
      <BookingFlow />
    </Suspense>
  );
}
