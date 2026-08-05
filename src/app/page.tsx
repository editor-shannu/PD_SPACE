'use client';

import { useState } from 'react';
import Link from 'next/link';
import KafkaRedisMonitor from '@/components/KafkaRedisMonitor';

export default function LandingPage() {
  // Hospital Collaboration Form State
  const [hospName, setHospName] = useState('');
  const [hospAddress, setHospAddress] = useState('');
  const [hospEmail, setHospEmail] = useState('');
  const [hospPhone, setHospPhone] = useState('');
  const [hospCapacity, setHospCapacity] = useState('100');
  const [hospSpecialties, setHospSpecialties] = useState('Cardiology, Neurology, Emergency Care');
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
    <div className="min-h-screen w-full bg-gradient-to-b from-[#e8f4f8] via-[#f0f8fc] to-[#f5fbff] text-gray-800 font-sans selection:bg-[#2ab8d8] selection:text-white flex flex-col">
      {/* Background Decorative Blur Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#2ab8d8]/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#003893]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col">
        {/* Top Sticky Header */}
        <header className="py-4 flex items-center justify-between border-b border-white/80 sticky top-0 bg-white/75 backdrop-blur-xl rounded-b-3xl px-6 shadow-sm mt-2 z-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#003893] to-[#2ab8d8] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#2ab8d8]/30">
              🩺
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-[#003893]">
                Medi<span className="text-[#2ab8d8]">Flow</span>
              </span>
              <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
                High-Scale AI &amp; Event Streaming Platform
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center space-x-1 text-xs font-black text-gray-600">
            <a href="#portals" className="px-3.5 py-2 rounded-xl hover:text-[#003893] hover:bg-white/80 transition">Portals</a>
            <a href="#highscale" className="px-3.5 py-2 rounded-xl hover:text-[#003893] hover:bg-white/80 transition">High-Scale Surge Engine</a>
            <a href="#about" className="px-3.5 py-2 rounded-xl hover:text-[#003893] hover:bg-white/80 transition">About</a>
            <a href="#facilities" className="px-3.5 py-2 rounded-xl hover:text-[#003893] hover:bg-white/80 transition">Facilities</a>
            <a href="#collaborate" className="px-3.5 py-2 rounded-xl hover:text-[#003893] hover:bg-white/80 transition">Hospital Partner</a>
          </nav>

          <div className="flex items-center space-x-2">
            <a
              href="https://patient-mediflow.shanmukhmedisetty.site"
              className="px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-[#003893] to-[#2ab8d8] rounded-2xl shadow-md shadow-[#003893]/20 hover:opacity-95 transition"
            >
              Patient Portal →
            </a>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-14 sm:py-20 text-center space-y-8">
          <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-white/80 border border-white/90 shadow-sm text-xs font-black text-[#003893]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span>⚡ Multi-Tenant Healthcare Ecosystem + Kafka &amp; Redis High-Speed Infrastructure</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#003893] tracking-tight max-w-5xl mx-auto leading-tight">
            Next-Gen Clinical Ecosystem with <span className="bg-gradient-to-r from-[#003893] via-[#2ab8d8] to-teal-500 bg-clip-text text-transparent">Sub-2ms Cache &amp; Real-Time Crowd Streaming</span>
          </h1>

          <p className="text-gray-600 text-sm sm:text-base max-w-3xl mx-auto font-semibold leading-relaxed">
            MediFlow scales crowd traffic using <strong className="text-[#003893]">Apache Kafka</strong> event streaming and <strong className="text-[#2ab8d8]">Redis</strong> fast memory caching across isolated subdomains for Patients, Doctors, Hospital Administrators, and System Governors.
          </p>

          {/* Quick Metrics Bar */}
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 text-left pt-2">
            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Redis Latency</span>
              <span className="text-2xl font-black text-amber-600">&lt; 2.0 ms</span>
              <span className="text-[10px] font-bold text-gray-500 block mt-0.5">Ultra-fast memory layer</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Kafka Pipeline</span>
              <span className="text-2xl font-black text-indigo-700">10,000+</span>
              <span className="text-[10px] font-bold text-gray-500 block mt-0.5">Crowd events / sec</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Gemini AI EMR</span>
              <span className="text-2xl font-black text-[#2ab8d8]">99.4%</span>
              <span className="text-[10px] font-bold text-gray-500 block mt-0.5">Multilingual OCR parsing</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Multi-Tenancy</span>
              <span className="text-2xl font-black text-emerald-600">4 Isolation</span>
              <span className="text-[10px] font-bold text-gray-500 block mt-0.5">Subdomain matrices</span>
            </div>
          </div>

          {/* Quick Access Subdomain Portals Cards */}
          <div id="portals" className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
            {[
              {
                title: 'Patient Portal',
                domain: 'patient-mediflow.shanmukhmedisetty.site',
                desc: 'Upload medical files, track EMR timeline, receive AI drug alerts, and schedule consultations.',
                icon: '👥',
                badge: 'bg-cyan-50 text-cyan-800 border-cyan-200',
              },
              {
                title: 'Doctor Portal',
                domain: 'doctor-mediflow.shanmukhmedisetty.site',
                desc: 'Manage clinical queues, pre-consultation AI summaries, digital signatures & doctor referrals.',
                icon: '🩺',
                badge: 'bg-blue-50 text-blue-800 border-blue-200',
              },
              {
                title: 'Hospital Admin Portal',
                domain: 'medi-hospadmin.shanmukhmedisetty.site',
                desc: 'Manage affiliated hospital staff, approve doctor requests & monitor hospital clinical stats.',
                icon: '🏥',
                badge: 'bg-teal-50 text-teal-800 border-teal-200',
              },
              {
                title: 'Main Admin Portal',
                domain: 'admin-mediflow.shanmukhmedisetty.site',
                desc: 'System analytics, partner hospital onboarding approvals & individual doctor registry controls.',
                icon: '⚙️',
                badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
              },
            ].map((portal, i) => (
              <a
                key={i}
                href={`https://${portal.domain}`}
                target="_blank"
                rel="noreferrer"
                className="p-6 rounded-3xl bg-white/85 backdrop-blur-xl border border-white/90 hover:scale-[1.02] transition-all duration-300 shadow-sm hover:shadow-xl group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{portal.icon}</span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${portal.badge}`}>
                      SUBDOMAIN
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-[#003893] group-hover:text-[#2ab8d8] transition">{portal.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 font-medium leading-relaxed">{portal.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] font-mono">
                  <span className="truncate max-w-[170px] text-gray-500 font-bold">{portal.domain}</span>
                  <span className="text-[#2ab8d8] font-bold group-hover:translate-x-1 transition text-sm">→</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* High-Scale Infrastructure Feature Section */}
        <section id="highscale" className="py-16 border-t border-gray-200/60 space-y-10">
          <div className="text-center space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-slate-900 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              ⚡ High-Scale Event Bus &amp; Caching Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#003893]">
              Massive Crowd Surge Management with Kafka &amp; Redis
            </h2>
            <p className="text-gray-600 text-sm max-w-2xl mx-auto font-semibold">
              Designed for peak hospital crowd surges, emergency room spikes, and simultaneous multi-tenant portal requests with live telemetry monitoring.
            </p>
          </div>

          {/* Embedded Interactive Telemetry Showcase */}
          <div className="max-w-5xl mx-auto">
            <KafkaRedisMonitor
              role="mainadmin"
              title="MediFlow Public Telemetry Showcase — Live Event Stream &amp; Redis Cache"
              className="shadow-2xl border border-slate-700"
            />
          </div>

          {/* Infrastructure Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-7 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center text-2xl font-black">
                ⚡
              </div>
              <h3 className="text-base font-black text-[#003893]">Redis Ultra-Fast Cache</h3>
              <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                In-memory caching layer storing appointment schedules (15s TTL) and nearby hospital facility queries (1h TTL). Guarantees sub-2ms response latency and prevents database thrashing under high traffic.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-700 flex items-center justify-center text-2xl font-black">
                📡
              </div>
              <h3 className="text-base font-black text-[#003893]">Kafka Asynchronous Bus</h3>
              <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                High-throughput event queue partitioning incoming surge requests into topic channels (<code className="text-indigo-900 font-mono text-[10px]">patient-crowd-events</code>, <code className="text-indigo-900 font-mono text-[10px]">doctor-queue-events</code>, <code className="text-indigo-900 font-mono text-[10px]">hospital-crowd-events</code>). Decouples heavy clinical tasks from client response loops.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center text-2xl font-black">
                🛡️
              </div>
              <h3 className="text-base font-black text-[#003893]">Automated Fallback Store</h3>
              <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                Integrated in-memory fallback mechanisms ensure 100% application uptime. If external Redis or Kafka instances are temporarily unreachable, MediFlow automatically switches to local memory brokers without service disruption.
              </p>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-16 border-t border-gray-200/60 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#2ab8d8]">About MediFlow</h2>
            <h3 className="text-3xl font-black text-[#003893]">Redefining Digital Health Infrastructure</h3>
            <p className="text-gray-600 text-sm max-w-2xl mx-auto font-medium">
              MediFlow bridges the gap between individual healthcare seekers, private clinical practices, and major hospital networks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#2ab8d8]/15 flex items-center justify-center text-2xl">🤖</div>
              <h4 className="text-base font-black text-[#003893]">AI-Powered EMR Processing</h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Utilizes Gemini AI models to analyze uploaded prescription images, extract medication dosages, and generate structured electronic medical records instantly with 7-language explanation support.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#003893]/10 flex items-center justify-center text-2xl">🏢</div>
              <h4 className="text-base font-black text-[#003893]">Multi-Tenant Subdomain Segregation</h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Hospitals operate in isolated domain spaces (<code className="text-[#003893] font-bold">medi-hospadmin</code>), allowing custom administrator access, salted bcrypt staff credentials, and independent patient management.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 flex items-center justify-center text-2xl">🩺</div>
              <h4 className="text-base font-black text-[#003893]">Dual-Queue Doctor Approval</h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Supports individual medical practitioners verified by Main Admin as well as hospital-affiliated doctors verified by their respective Hospital Admins, complete with a 7-day cooling period gate on re-applications.
              </p>
            </div>
          </div>
        </section>

        {/* Facilities Section */}
        <section id="facilities" className="py-16 border-t border-gray-200/60 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#2ab8d8]">Platform Capabilities</h2>
            <h3 className="text-3xl font-black text-[#003893]">Comprehensive Clinical Facilities &amp; Tools</h3>
            <p className="text-gray-600 text-sm max-w-2xl mx-auto font-medium">
              Everything required for modern healthcare delivery, from automated reminders to cross-specialty doctor referrals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '📋',
                title: 'Mandatory EMR Intake',
                desc: 'Comprehensive patient medical intake form capturing allergies, surgical history, blood type, and emergency contacts.',
              },
              {
                icon: '📅',
                title: 'Smart Checkup Scheduling',
                desc: 'Automated appointment queuing with Redis fast caching, compliance calculations, and missed follow-up alerts.',
              },
              {
                icon: '🔄',
                title: 'Doctor-to-Doctor Referrals',
                desc: 'Verified doctors can seamlessly transfer clinical summaries and refer patients across specialized departments.',
              },
              {
                icon: '🔑',
                title: 'Bcrypt Hashing & Auto Credentials',
                desc: '10-round salted bcrypt password encryption and automatic generation of hospital admin login credentials upon approval.',
              },
              {
                icon: '📊',
                title: 'Clinical Bottleneck Analytics',
                desc: 'Visual Recharts tracking department workloads, compliance scores, treatment timelines, and hospital bed capacities.',
              },
              {
                icon: '🛡️',
                title: 'Subdomain Access Control',
                desc: 'Enterprise-grade domain middleware ensuring strict role boundaries, zero cross-portal session collisions, and data privacy.',
              },
            ].map((facility, i) => (
              <div key={i} className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-2">
                <span className="text-2xl">{facility.icon}</span>
                <h4 className="text-sm font-black text-[#003893]">{facility.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">{facility.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hospital Collaboration Application Form */}
        <section id="collaborate" className="py-16 border-t border-gray-200/60">
          <div className="p-8 sm:p-12 rounded-3xl bg-white/90 backdrop-blur-xl border border-white/90 shadow-lg space-y-8">
            <div className="max-w-2xl space-y-2">
              <span className="px-3.5 py-1 rounded-full bg-[#2ab8d8]/15 border border-[#2ab8d8]/30 text-[#003893] text-[10px] font-black uppercase">
                Hospital Collaboration Onboarding
              </span>
              <h2 className="text-3xl font-black text-[#003893]">Partner With MediFlow</h2>
              <p className="text-gray-600 text-xs font-semibold leading-relaxed">
                Hospitals can apply for collaboration to receive a dedicated Hospital Admin portal (<code className="text-[#003893] font-bold">medi-hospadmin.shanmukhmedisetty.site</code>) to manage staff doctors, approve applications, and oversee patient care data.
              </p>
            </div>

            {submitSuccess ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-xs font-semibold text-emerald-800">
                <h4 className="text-base font-black text-emerald-900 flex items-center gap-2">
                  <span>🎉</span> Application Submitted Successfully!
                </h4>
                <p>
                  Your hospital collaboration application has been transmitted to the MediFlow Main Admin team.
                  Upon approval, unique Hospital ID credentials will be generated and provided to your contact email.
                </p>
                <button
                  onClick={() => setSubmitSuccess(false)}
                  className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition text-xs shadow"
                >
                  Submit Another Application
                </button>
              </div>
            ) : (
              <form onSubmit={handleHospitalApply} className="space-y-4 text-xs font-bold text-gray-700">
                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                    ⚠️ {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-gray-500 font-bold uppercase text-[10px]">Hospital Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={hospName}
                      onChange={(e) => setHospName(e.target.value)}
                      placeholder="e.g. St. Jude Healthcare Hospital"
                      className="w-full p-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:border-[#2ab8d8] focus:bg-white outline-none text-gray-800 transition text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-gray-500 font-bold uppercase text-[10px]">Official Contact Email *</label>
                    <input
                      type="email"
                      required
                      value={hospEmail}
                      onChange={(e) => setHospEmail(e.target.value)}
                      placeholder="admin@stjudehospital.org"
                      className="w-full p-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:border-[#2ab8d8] focus:bg-white outline-none text-gray-800 transition text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block mb-1 text-gray-500 font-bold uppercase text-[10px]">Full Hospital Address *</label>
                    <input
                      type="text"
                      required
                      value={hospAddress}
                      onChange={(e) => setHospAddress(e.target.value)}
                      placeholder="124 Medical Plaza Way, Suite 400"
                      className="w-full p-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:border-[#2ab8d8] focus:bg-white outline-none text-gray-800 transition text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-gray-500 font-bold uppercase text-[10px]">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      value={hospPhone}
                      onChange={(e) => setHospPhone(e.target.value)}
                      placeholder="+1 (555) 890-1234"
                      className="w-full p-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:border-[#2ab8d8] focus:bg-white outline-none text-gray-800 transition text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-gray-500 font-bold uppercase text-[10px]">Total Bed Capacity</label>
                    <input
                      type="number"
                      value={hospCapacity}
                      onChange={(e) => setHospCapacity(e.target.value)}
                      placeholder="150"
                      className="w-full p-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:border-[#2ab8d8] focus:bg-white outline-none text-gray-800 transition text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-gray-500 font-bold uppercase text-[10px]">Key Specialties (Comma Separated)</label>
                    <input
                      type="text"
                      value={hospSpecialties}
                      onChange={(e) => setHospSpecialties(e.target.value)}
                      placeholder="Cardiology, Oncology, Pediatrics"
                      className="w-full p-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:border-[#2ab8d8] focus:bg-white outline-none text-gray-800 transition text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-gray-500 font-bold uppercase text-[10px]">Reason for Collaboration Request</label>
                  <textarea
                    rows={3}
                    value={hospReason}
                    onChange={(e) => setHospReason(e.target.value)}
                    placeholder="Describe your hospital facility, staff size, and goals for joining the MediFlow ecosystem."
                    className="w-full p-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:border-[#2ab8d8] focus:bg-white outline-none text-gray-800 transition text-xs font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-2xl bg-[#003893] hover:bg-[#002868] text-white font-black text-xs shadow-md shadow-[#003893]/20 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Hospital Application...' : 'Submit Collaboration Application →'}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-gray-200/60 text-center text-xs text-gray-500 space-y-2 mt-auto">
          <p>© {new Date().getFullYear()} MediFlow Healthcare Platform. All rights reserved.</p>
          <p className="text-[11px] text-gray-400 font-medium">
            For support or administrative inquiries: <strong className="text-[#003893]">heallink.care@gmail.com</strong>
          </p>
        </footer>
      </div>
    </div>
  );
}
