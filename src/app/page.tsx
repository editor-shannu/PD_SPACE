/**
 * MediFlow — Splash Screen
 * Mobile-app layout: phone-width card on desktop, full-screen on mobile
 * Blue top with illustration, white bottom with brand + CTA
 */
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    /*
     * Full viewport teal background, card centered.
     * Mobile: full-screen. Desktop: phone-width card centered with teal bg around it.
     */
    <div className="min-h-screen w-full bg-[#2ab8d8] flex items-center justify-center">
      {/* Phone-width card */}
      <div className="w-full md:max-w-sm md:rounded-[40px] md:overflow-hidden md:shadow-2xl flex flex-col min-h-screen md:min-h-[700px] md:h-auto">

        {/* ── Top: Teal illustration area ──────────────── */}
        <div className="relative bg-[#2ab8d8] flex-1 flex items-center justify-center overflow-hidden py-10 px-4">
          {/* Decorative circles */}
          <div className="absolute top-[-50px] left-[-50px] w-44 h-44 rounded-full bg-white/10" />
          <div className="absolute bottom-[-30px] right-[-40px] w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute top-8 right-8 w-14 h-14 rounded-full bg-white/10" />

          {/* Illustration */}
          <div className="relative z-10 w-64 h-64">
            <Image
              src="/mediflow_hero.png"
              alt="MediFlow doctors illustration"
              fill
              className="object-contain drop-shadow-xl"
              priority
            />
          </div>
        </div>

        {/* ── Bottom: White brand + CTA area ───────────── */}
        <div className="bg-white rounded-t-[40px] md:rounded-none px-8 pt-8 pb-10 flex flex-col items-center gap-5">
          {/* Brand */}
          <div className="text-center">
            <h1 className="text-4xl font-black text-[#003893] tracking-tight leading-none">
              MediFlow
            </h1>
            <p className="text-[#2ab8d8] font-semibold text-sm mt-2">
              Connecting you to better healthcare!
            </p>
          </div>

          {/* Tagline */}
          <p className="text-gray-400 text-sm text-center leading-relaxed">
            Upload prescriptions, get AI-powered medical insights, and manage your health records — all in one place.
          </p>

          {/* Login CTA */}
          <Link
            href="/auth/login"
            className="w-full bg-[#003893] hover:bg-[#0b4497] active:scale-[0.98] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 text-center uppercase tracking-widest text-sm transition-all duration-200"
          >
            Login
          </Link>

          {/* Sign up link */}
          <p className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link href="/auth/login" className="text-[#2ab8d8] font-bold hover:underline">
              Sign up!
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
