/**
 * Heal Link Landing Splash Page
 */
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-[#e6f4f8] to-[#33aed6]/20 flex flex-col justify-between overflow-y-auto">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#003893] flex items-center justify-center text-white font-bold text-lg">
            H
          </div>
          <span className="text-xl font-bold text-[#003893]">Heal Link</span>
        </div>
        <Link
          href="/auth/login"
          className="px-5 py-2.5 bg-white hover:bg-gray-50 text-[#003893] font-bold rounded-xl shadow-sm hover:shadow border border-gray-100 transition duration-200 text-sm"
        >
          Login
        </Link>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-center gap-12">
        {/* Left Side: Copywriting */}
        <div className="flex-1 max-w-md text-center md:text-left space-y-6">
          <div className="inline-block px-3 py-1 bg-blue-100/60 rounded-full text-xs font-bold text-[#003893] uppercase tracking-wider">
            Smart Health Records
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#003893] leading-tight">
            Connecting you to <span className="text-[#33aed6]">better healthcare</span>
          </h1>
          <p className="text-gray-500 font-medium text-sm md:text-base leading-relaxed">
            Upload prescriptions, diagnostic reports, and discharge summaries. Get instant AI structured insights and catalog your medical records securely.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link
              href="/auth/login"
              className="px-8 py-4 bg-[#003893] hover:bg-[#0b4497] text-white text-center font-bold rounded-2xl shadow-md hover:shadow-lg transition duration-200 text-sm uppercase tracking-wider"
            >
              Get Started
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 bg-white/80 hover:bg-white text-gray-700 text-center font-bold rounded-2xl border border-gray-200 transition duration-200 text-sm"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Right Side: Hero Illustration */}
        <div className="flex-1 w-full max-w-lg aspect-[4/3] relative flex items-center justify-center">
          <div className="relative w-full h-full min-h-[300px] transition-transform duration-500 hover:scale-102">
            <Image
              src="/heal_link_hero.png"
              alt="Heal Link Doctors Illustration"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-gray-400 font-medium">
        &copy; {new Date().getFullYear()} Heal Link. All rights reserved.
      </footer>
    </main>
  );
}
