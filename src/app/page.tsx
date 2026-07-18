/**
 * MediFlow — Splash / Landing Page
 * Dark navy card-based design
 */
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0f2c] flex flex-col overflow-hidden relative">
      {/* Background glow orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full bg-[#3b82f6]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 rounded-full bg-[#6366f1]/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#6366f1] flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-xl font-black text-white tracking-tight">MediFlow</span>
        </div>
        <Link
          href="/auth/login"
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/10 transition duration-200 text-sm backdrop-blur-sm"
        >
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          AI-Powered Healthcare Navigation
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] max-w-4xl mb-6">
          Your Health,{' '}
          <span className="bg-gradient-to-r from-[#3b82f6] to-[#a78bfa] bg-clip-text text-transparent">
            Intelligently
          </span>{' '}
          Managed
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mb-12 leading-relaxed">
          Upload prescriptions and reports. Get AI-structured insights, specialist recommendations,
          and a complete medical timeline — all in one place.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link
            href="/auth/login"
            className="px-8 py-4 bg-gradient-to-r from-[#3b82f6] to-[#6366f1] hover:opacity-90 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 transition duration-200 text-sm tracking-wide"
          >
            Get Started Free →
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-2xl border border-white/10 transition duration-200 text-sm backdrop-blur-sm"
          >
            See How It Works
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full">
          {[
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              ),
              color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
              iconColor: 'text-blue-400',
              title: 'Document AI',
              desc: 'OCR + Gemini extracts structured data from any medical document.',
            },
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              ),
              color: 'from-violet-500/20 to-violet-600/10 border-violet-500/20',
              iconColor: 'text-violet-400',
              title: 'Medical Timeline',
              desc: 'Your full health history visualized in a chronological timeline.',
            },
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              ),
              color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
              iconColor: 'text-emerald-400',
              title: 'AI Specialist Match',
              desc: 'Describe symptoms and get the right department recommendation.',
            },
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              ),
              color: 'from-amber-500/20 to-amber-600/10 border-amber-500/20',
              iconColor: 'text-amber-400',
              title: 'Smart Reminders',
              desc: 'Never miss a follow-up or medication dose with smart alerts.',
            },
          ].map((feat, i) => (
            <div
              key={i}
              className={`bg-gradient-to-br ${feat.color} border rounded-2xl p-5 text-left backdrop-blur-sm`}
            >
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3 ${feat.iconColor}`}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {feat.icon}
                </svg>
              </div>
              <h3 className="text-white font-bold text-sm mb-1">{feat.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-gray-600 text-xs font-medium">
        © {new Date().getFullYear()} MediFlow. All rights reserved.
      </footer>
    </main>
  );
}
