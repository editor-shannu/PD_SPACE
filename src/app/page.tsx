'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  // Hospital Collaboration Form State
  const [hospName, setHospName] = useState('');
  const [hospAddress, setHospAddress] = useState('');
  const [hospEmail, setHospEmail] = useState('');
  const [hospPhone, setHospPhone] = useState('');
  const [hospCapacity, setHospCapacity] = useState('100');
  const [hospSpecialties, setHospSpecialties] = useState('Cardiology, Neurology, General Surgery');
  const [hospReason, setHospReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleHospitalApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const res = await fetch('/api/hospital/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hospName,
          address: hospAddress,
          contactEmail: hospEmail,
          phone: hospPhone,
          bedCapacity: parseInt(hospCapacity, 10) || 50,
          specialties: hospSpecialties.split(',').map((s) => s.trim()).filter(Boolean),
          reasonToJoin: hospReason,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess(true);
        setHospName('');
        setHospAddress('');
        setHospEmail('');
        setHospPhone('');
        setHospReason('');
      } else {
        setSubmitError(data.error || 'Failed to submit hospital application.');
      }
    } catch (err: any) {
      setSubmitError('Network error while submitting hospital application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[#2ab8d8] selection:text-white">
      {/* Dynamic Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#003893]/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#2ab8d8]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Header */}
        <header className="py-6 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#003893] to-[#2ab8d8] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-500/20">
              🩺
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white">Medi<span className="text-[#2ab8d8]">Flow</span></span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Clinical AI Ecosystem</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6 text-xs font-bold text-slate-300">
            <a href="#about" className="hover:text-[#2ab8d8] transition">About</a>
            <a href="#facilities" className="hover:text-[#2ab8d8] transition">Facilities</a>
            <a href="#portals" className="hover:text-[#2ab8d8] transition">Portals</a>
            <a href="#collaborate" className="hover:text-[#2ab8d8] transition">Hospital Partner</a>
          </nav>

          <a
            href="/auth/login"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2ab8d8] to-[#003893] hover:from-[#1fb1d1] hover:to-[#082f73] text-white font-extrabold text-xs transition shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
          >
            Sign In Portal →
          </a>
        </header>

        {/* Hero Section */}
        <section className="py-20 text-center space-y-8">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-[#2ab8d8]">
            <span className="animate-ping w-2 h-2 rounded-full bg-[#2ab8d8] inline-block" />
            <span>Multi-Tenant Enterprise Healthcare Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight">
            Intelligent Clinical Ecosystem for <span className="bg-gradient-to-r from-[#2ab8d8] via-sky-300 to-indigo-400 bg-clip-text text-transparent">Patients, Doctors &amp; Hospitals</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed">
            MediFlow unifies personal health records, AI prescription parsing, doctor referrals, and isolated multi-tenant hospital administration into one seamless, secure network.
          </p>

          {/* Quick Access Subdomain Portals Cards */}
          <div id="portals" className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {[
              {
                title: 'Patient Portal',
                domain: 'patient-mediflow.shanmukhmedisetty.site',
                desc: 'Upload medical files, track EMR timeline, and schedule consultations.',
                icon: '👥',
                color: 'from-cyan-500/10 to-sky-500/5 border-cyan-500/30 text-cyan-400',
              },
              {
                title: 'Doctor Portal',
                domain: 'doctor-mediflow.shanmukhmedisetty.site',
                desc: 'Manage clinical appointments, review patient EMR, & process referrals.',
                icon: '🩺',
                color: 'from-blue-500/10 to-indigo-500/5 border-blue-500/30 text-blue-400',
              },
              {
                title: 'Hospital Admin Portal',
                domain: 'medi-hospadmin.shanmukhmedisetty.site',
                desc: 'Manage affiliated hospital staff, approve doctors, & monitor hospital stats.',
                icon: '🏥',
                color: 'from-teal-500/10 to-emerald-500/5 border-teal-500/30 text-teal-400',
              },
              {
                title: 'Main Admin Portal',
                domain: 'admin-mediflow.shanmukhmedisetty.site',
                desc: 'System-wide analytics, hospital collaboration approvals, & registry oversight.',
                icon: '⚙️',
                color: 'from-[#003893]/20 to-purple-500/5 border-[#003893]/40 text-sky-300',
              },
            ].map((portal, i) => (
              <a
                key={i}
                href={`https://${portal.domain}`}
                target="_blank"
                rel="noreferrer"
                className={`p-6 rounded-3xl bg-gradient-to-br ${portal.color} border backdrop-blur-xl hover:scale-[1.03] transition-all duration-300 shadow-xl group flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{portal.icon}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300">
                      SUBDOMAIN
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white group-hover:text-[#2ab8d8] transition">{portal.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">{portal.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                  <span className="truncate max-w-[170px] text-slate-400">{portal.domain}</span>
                  <span className="text-[#2ab8d8] font-bold group-hover:translate-x-1 transition">→</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-16 border-t border-slate-800/80 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#2ab8d8]">About MediFlow</h2>
            <h3 className="text-3xl font-black text-white">Redefining Digital Health Infrastructure</h3>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto font-medium">
              MediFlow bridges the gap between individual healthcare seekers, private clinical practices, and major hospital networks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="text-3xl">🤖</span>
              <h4 className="text-base font-black text-white">AI-Powered EMR Processing</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Utilizes Gemini AI models to analyze uploaded prescription images, extract medication dosages, and generate structured electronic medical records instantly.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="text-3xl">🏢</span>
              <h4 className="text-base font-black text-white">Multi-Tenant Subdomain Segregation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hospitals operate in isolated domain spaces (`medi-hospadmin`), allowing custom administrator access, staff credentials, and independent patient management.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="text-3xl">🩺</span>
              <h4 className="text-base font-black text-white">Dual-Queue Doctor Approval</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Supports individual medical practitioners verified by Main Admin as well as hospital-affiliated doctors verified by their respective Hospital Admins.
              </p>
            </div>
          </div>
        </section>

        {/* Facilities Section */}
        <section id="facilities" className="py-16 border-t border-slate-800/80 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#2ab8d8]">Platform Facilities</h2>
            <h3 className="text-3xl font-black text-white">Comprehensive Clinical Facilities &amp; Tools</h3>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto font-medium">
              Everything required for modern healthcare delivery, from automated reminders to cross-specialty doctor referrals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '📋',
                title: 'Mandatory EMR Intake',
                desc: 'Comprehensive patient medical intake form capturing allergies, surgical history, and emergency contacts.',
              },
              {
                icon: '📅',
                title: 'Smart Checkup Scheduling',
                desc: 'Automated follow-up tracking with compliance calculations and missed appointment alerts.',
              },
              {
                icon: '🔄',
                title: 'Doctor-to-Doctor Referrals',
                desc: 'Verified doctors can seamlessly transfer clinical summaries and refer patients across departments.',
              },
              {
                icon: '🔑',
                title: 'Automated Credential Generation',
                desc: 'Instant generation of hospital admin login IDs and temp credentials upon collaboration approval.',
              },
              {
                icon: '📊',
                title: 'Clinical Bottleneck Analytics',
                desc: 'Visual bar charts and pie charts tracking department loads, timelines, and follow-up compliance.',
              },
              {
                icon: '🛡️',
                title: 'Subdomain Access Control',
                desc: 'Enterprise-grade domain isolation ensuring strict role boundaries and data privacy.',
              },
            ].map((facility, i) => (
              <div key={i} className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition space-y-2">
                <span className="text-2xl">{facility.icon}</span>
                <h4 className="text-sm font-black text-white">{facility.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{facility.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hospital Collaboration Application Form */}
        <section id="collaborate" className="py-16 border-t border-slate-800/80">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-900 to-[#003893]/20 border border-slate-800 space-y-8">
            <div className="max-w-2xl space-y-2">
              <span className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-black uppercase">
                Hospital Collaboration Onboarding
              </span>
              <h2 className="text-3xl font-black text-white">Partner With MediFlow</h2>
              <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                Hospitals can apply for collaboration to receive a dedicated Hospital Admin dashboard (`medi-hospadmin`) to manage doctors, staff credentials, and clinical operations.
              </p>
            </div>

            {submitSuccess ? (
              <div className="p-6 bg-emerald-950/60 border border-emerald-800 rounded-2xl space-y-2 text-xs font-semibold text-emerald-300">
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <span>🎉</span> Application Submitted Successfully!
                </h4>
                <p>
                  Your hospital collaboration application has been transmitted to the MediFlow Main Admin team.
                  Upon approval, unique Hospital ID credentials will be generated and provided to your contact email.
                </p>
                <button
                  onClick={() => setSubmitSuccess(false)}
                  className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold transition text-xs"
                >
                  Submit Another Application
                </button>
              </div>
            ) : (
              <form onSubmit={handleHospitalApply} className="space-y-4 text-xs font-bold text-slate-300">
                {submitError && (
                  <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl">
                    ⚠️ {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-slate-400">Hospital Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={hospName}
                      onChange={(e) => setHospName(e.target.value)}
                      placeholder="e.g. St. Jude Healthcare Hospital"
                      className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-[#2ab8d8] outline-none text-white transition text-xs"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-slate-400">Official Contact Email *</label>
                    <input
                      type="email"
                      required
                      value={hospEmail}
                      onChange={(e) => setHospEmail(e.target.value)}
                      placeholder="admin@stjudehospital.org"
                      className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-[#2ab8d8] outline-none text-white transition text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block mb-1 text-slate-400">Full Hospital Address *</label>
                    <input
                      type="text"
                      required
                      value={hospAddress}
                      onChange={(e) => setHospAddress(e.target.value)}
                      placeholder="124 Medical Plaza Way, Suite 400"
                      className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-[#2ab8d8] outline-none text-white transition text-xs"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-slate-400">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      value={hospPhone}
                      onChange={(e) => setHospPhone(e.target.value)}
                      placeholder="+1 (555) 890-1234"
                      className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-[#2ab8d8] outline-none text-white transition text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-slate-400">Total Bed Capacity</label>
                    <input
                      type="number"
                      value={hospCapacity}
                      onChange={(e) => setHospCapacity(e.target.value)}
                      placeholder="150"
                      className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-[#2ab8d8] outline-none text-white transition text-xs"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-slate-400">Key Specialties (Comma Separated)</label>
                    <input
                      type="text"
                      value={hospSpecialties}
                      onChange={(e) => setHospSpecialties(e.target.value)}
                      placeholder="Cardiology, Oncology, Pediatrics"
                      className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-[#2ab8d8] outline-none text-white transition text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-slate-400">Reason for Collaboration Request</label>
                  <textarea
                    rows={3}
                    value={hospReason}
                    onChange={(e) => setHospReason(e.target.value)}
                    placeholder="Describe your hospital facility, staff size, and goals for joining the MediFlow ecosystem."
                    className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-[#2ab8d8] outline-none text-white transition text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-[#003893] hover:from-teal-400 hover:to-[#082f73] text-white font-extrabold text-xs shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Hospital Application...' : 'Submit Collaboration Application →'}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
          <p>© {new Date().getFullYear()} MediFlow Healthcare Platform. All rights reserved.</p>
          <p className="text-[11px] text-slate-400">
            For support or administrative inquiries: <strong className="text-[#2ab8d8]">heallink.care@gmail.com</strong>
          </p>
        </footer>
      </div>
    </div>
  );
}
