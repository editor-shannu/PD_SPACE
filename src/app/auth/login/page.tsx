/**
 * MediFlow — Login Page
 * Same visual style as splash (image 3): blue top, white glassmorphic bottom
 * Google Sign-In via Firebase popup with COOP header fix
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { signIn } from 'next-auth/react';
import { auth, googleProvider } from '@/lib/firebase';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard/patient';

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      // Firebase Google popup (COOP header added in next.config.js allows this)
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Hand token to NextAuth for session
      const nextAuthResult = await signIn('credentials', {
        idToken,
        redirect: false,
        callbackUrl,
      });

      if (!nextAuthResult?.ok) {
        setError('Sign-in failed. Please try again.');
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col bg-[#2ab8d8] overflow-hidden">
      {/* ─── TOP SECTION: Brand ────────────────────────────── */}
      <div className="relative flex-[0.55] flex flex-col items-center justify-center min-h-[45vh] bg-[#2ab8d8] overflow-hidden px-6">
        {/* Decorative circles */}
        <div className="absolute top-[-50px] left-[-50px] w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute bottom-[-20px] right-[-30px] w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute top-8 right-8 w-14 h-14 rounded-full bg-white/10" />

        {/* Logo icon */}
        <div className="relative z-10 w-20 h-20 rounded-[28px] bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-xl mb-5">
          <svg className="h-10 w-10 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
          </svg>
        </div>

        {/* Brand name */}
        <h1 className="relative z-10 text-4xl font-black text-white tracking-tight drop-shadow">
          MediFlow
        </h1>
        <p className="relative z-10 text-white/80 font-medium text-sm mt-1.5">
          AI-Powered Healthcare Navigation
        </p>
      </div>

      {/* ─── BOTTOM SECTION: Login Form ────────────────────── */}
      <div className="bg-white rounded-t-[40px] shadow-2xl px-8 pt-10 pb-12 flex flex-col items-center gap-5 flex-[0.45] min-h-[45vh]">

        {/* Title */}
        <p className="text-gray-400 font-semibold text-xs uppercase tracking-widest">
          Sign in to your account
        </p>

        {/* Error Message */}
        {error && (
          <div className="w-full max-w-xs bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-red-600 text-xs font-medium text-center">{error}</p>
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-[#003893] hover:bg-[#0b4497] active:bg-[#002570] disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 transition duration-200 text-sm"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in...
            </>
          ) : (
            <>
              {/* Google G icon */}
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Terms */}
        <p className="text-gray-400 text-xs text-center leading-relaxed max-w-xs">
          By continuing, you agree to MediFlow's{' '}
          <span className="text-[#003893] font-semibold cursor-pointer hover:underline">Terms of Service</span>{' '}
          and{' '}
          <span className="text-[#003893] font-semibold cursor-pointer hover:underline">Privacy Policy</span>.
        </p>

        {/* Back link */}
        <p className="text-gray-400 text-sm">
          ←{' '}
          <Link href="/" className="text-[#2ab8d8] font-semibold hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen w-full flex flex-col bg-[#2ab8d8] items-center justify-center">
          <div className="text-white font-semibold">Loading...</div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
