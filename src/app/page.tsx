/**
 * MediFlow — Splash Screen
 * Layout inspired by image 3: blue top with illustration, white bottom with brand + CTA
 */
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen w-full flex flex-col bg-[#2ab8d8] overflow-hidden">
      {/* ─── TOP SECTION: Illustration ─────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center min-h-[55vh] bg-[#2ab8d8] overflow-hidden">
        {/* Subtle circle decorations */}
        <div className="absolute top-[-60px] left-[-60px] w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute bottom-[-30px] right-[-40px] w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute top-10 right-10 w-16 h-16 rounded-full bg-white/10" />

        {/* Hero illustration */}
        <div className="relative w-full max-w-xs mx-auto px-4 aspect-square">
          <Image
            src="/mediflow_hero.png"
            alt="MediFlow — Doctors Illustration"
            fill
            className="object-contain drop-shadow-2xl"
            priority
          />
        </div>
      </div>

      {/* ─── BOTTOM SECTION: Brand + CTA ───────────────────── */}
      <div className="bg-white rounded-t-[40px] shadow-2xl px-8 pt-10 pb-12 flex flex-col items-center gap-6 min-h-[45vh]">
        {/* Brand */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-[#003893] tracking-tight leading-none">
            MediFlow
          </h1>
          <p className="text-[#2ab8d8] font-semibold text-sm mt-2">
            Connecting you to better healthcare!
          </p>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm text-center leading-relaxed max-w-xs">
          Upload prescriptions, get AI-powered medical insights, and manage your health records — all in one place.
        </p>

        {/* Login CTA */}
        <Link
          href="/auth/login"
          className="w-full max-w-xs bg-[#003893] hover:bg-[#0b4497] active:bg-[#002570] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/30 text-center uppercase tracking-widest text-sm transition duration-200"
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
    </main>
  );
}
