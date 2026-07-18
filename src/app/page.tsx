/**
 * Heal Link Landing Splash Page
 */
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#33aed6] flex flex-col justify-between overflow-hidden">
      {/* Top Hero Section with Doctors Illustration */}
      <div className="flex-1 relative flex items-center justify-center p-6 md:p-12">
        <div className="relative w-full max-w-md aspect-square max-h-[45vh] transition-transform duration-500 hover:scale-105">
          <Image
            src="/heal_link_hero.png"
            alt="Heal Link Doctors Illustration"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Bottom Sheet Container */}
      <div className="bg-white rounded-t-[40px] px-8 pt-12 pb-10 flex flex-col items-center shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] w-full max-w-md mx-auto md:max-w-lg">
        {/* Title */}
        <h1 className="text-4xl font-bold text-[#003893] mb-2 tracking-tight">
          Heal Link
        </h1>

        {/* Subtitle */}
        <p className="text-[#33aed6] text-center font-medium mb-10 text-base">
          Connecting you to better healthcare!
        </p>

        {/* Login Button */}
        <Link
          href="/auth/login"
          className="w-full py-4 bg-[#003893] hover:bg-[#0b4497] text-white text-center font-bold rounded-2xl shadow-md hover:shadow-lg transition duration-200 text-sm tracking-wide uppercase"
        >
          Login
        </Link>

        {/* Signup Link */}
        <p className="mt-6 text-gray-400 text-xs font-medium">
          Don't have an account?{' '}
          <Link href="/auth/login" className="text-[#33aed6] hover:underline font-semibold">
            Sign up!
          </Link>
        </p>
      </div>
    </main>
  );
}
