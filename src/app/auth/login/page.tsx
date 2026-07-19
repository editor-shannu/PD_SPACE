/**
 * MediFlow — Login Page
 * Mobile-app style layout: constrained card centered on desktop, full-screen on mobile
 * Google Sign-In via Firebase popup → passes user fields to NextAuth
 */

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { signIn } from 'next-auth/react';
import { auth, googleProvider } from '@/lib/firebase';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard/patient';

  const [error, setError]       = useState('');
  const [isLoading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    console.log('[DEBUG] Continue with Google clicked');
    setError('');
    setLoading(true);
    try {
      console.log('[DEBUG] Calling signInWithPopup...');
      const result = await signInWithPopup(auth, googleProvider);
      const user   = result.user;
      console.log('[DEBUG] signInWithPopup resolved, user:', user.email, user.uid);

      console.log('[DEBUG] Calling NextAuth credentials signIn...');
      const nextAuthResult = await signIn('credentials', {
        email:    user.email    ?? '',
        name:     user.displayName ?? user.email?.split('@')[0] ?? 'Patient',
        image:    user.photoURL ?? '',
        uid:      user.uid      ?? '',
        redirect: false,
        callbackUrl,
      });
      console.log('[DEBUG] NextAuth credentials signIn resolved:', nextAuthResult);

      if (!nextAuthResult?.ok) {
        console.error('[DEBUG] NextAuth error:', nextAuthResult?.error);
        setError('Sign-in failed. Please try again.');
        setLoading(false);
        return;
      }

      console.log('[DEBUG] Redirecting to callbackUrl:', callbackUrl);
      window.location.href = callbackUrl;
    } catch (err: any) {
      console.error('[DEBUG] Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked — please allow popups for this site.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    /* 
     * Outer: fills full viewport with teal, centers the card.
     * On mobile: card is full-screen (no gap).
     * On desktop: card is phone-width, centered, with teal background visible around it.
     */
    <div className="min-h-screen w-full bg-[#2ab8d8] flex items-center justify-center">
      {/* Phone-width card: full-screen on mobile, constrained + rounded on desktop */}
      <div className="w-full md:max-w-sm md:rounded-[40px] md:overflow-hidden md:shadow-2xl flex flex-col min-h-screen md:min-h-[680px] md:h-auto">

        {/* ── Top: Teal brand area ─────────────────────── */}
        <div className="relative bg-[#2ab8d8] flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-[-40px] left-[-40px] w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute bottom-[-20px] right-[-30px] w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute top-6 right-8 w-12 h-12 rounded-full bg-white/10" />

          {/* Logo icon */}
          <div className="relative z-10 w-[72px] h-[72px] rounded-[22px] bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-xl mb-4">
            <svg className="h-9 w-9 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
            </svg>
          </div>
          <h1 className="relative z-10 text-3xl font-black text-white tracking-tight drop-shadow">MediFlow</h1>
          <p className="relative z-10 text-white/80 text-sm font-medium mt-1">AI-Powered Healthcare Navigation</p>
        </div>

        {/* ── Bottom: White form area ──────────────────── */}
        <div className="bg-white rounded-t-[36px] md:rounded-none px-8 pt-8 pb-10 flex flex-col items-center gap-5">
          <p className="text-gray-400 font-semibold text-xs uppercase tracking-widest">Sign in to your account</p>

          {/* Error */}
          {error && (
            <div className="w-full bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <p className="text-red-500 text-xs font-medium text-center">{error}</p>
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-[#003893] hover:bg-[#0b4497] active:scale-[0.98] disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 transition-all duration-200 text-sm"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {process.env.NODE_ENV === 'development' && (
            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  try {
                    console.log('[DEBUG] Dev Patient Bypass clicked');
                    const nextAuthResult = await signIn('credentials', {
                      email:    'test-patient@mediflow.care',
                      name:     'Test Patient',
                      image:    '',
                      uid:      'dev-patient-123',
                      redirect: false,
                      callbackUrl,
                    });
                    if (!nextAuthResult?.ok) {
                      setError('Bypass failed: ' + (nextAuthResult?.error || 'unknown error'));
                      setLoading(false);
                      return;
                    }
                    window.location.href = callbackUrl;
                  } catch (err: any) {
                    setError('Bypass error: ' + err.message);
                    setLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] disabled:bg-gray-300 text-white font-bold py-3 rounded-2xl shadow transition-all duration-200 text-xs"
              >
                Patient Dev Bypass
              </button>
              <button
                type="button"
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  try {
                    console.log('[DEBUG] Dev Admin Bypass clicked');
                    const nextAuthResult = await signIn('credentials', {
                      email:    'heallink.care@gmail.com',
                      name:     'Admin User',
                      image:    '',
                      uid:      'dev-admin-123',
                      redirect: false,
                      callbackUrl: '/dashboard/admin',
                    });
                    if (!nextAuthResult?.ok) {
                      setError('Bypass failed: ' + (nextAuthResult?.error || 'unknown error'));
                      setLoading(false);
                      return;
                    }
                    window.location.href = '/dashboard/admin';
                  } catch (err: any) {
                    setError('Bypass error: ' + err.message);
                    setLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:bg-gray-300 text-white font-bold py-3 rounded-2xl shadow transition-all duration-200 text-xs"
              >
                Admin Dev Bypass
              </button>
            </div>
          )}

          <p className="text-gray-400 text-xs text-center leading-relaxed">
            By continuing, you agree to MediFlow's{' '}
            <span className="text-[#003893] font-semibold cursor-pointer hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-[#003893] font-semibold cursor-pointer hover:underline">Privacy Policy</span>.
          </p>

          <Link href="/" className="text-gray-400 text-sm hover:text-[#2ab8d8] transition">
            ← Back to home
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-[#2ab8d8] flex items-center justify-center">
        <div className="text-white font-semibold text-sm">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
