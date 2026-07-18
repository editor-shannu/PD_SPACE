/**
 * MediFlow — Login page with Firebase Google Sign-In
 * After Google auth, we call our Next-Auth session to persist across the app
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

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      // 1. Firebase Google popup
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // 2. Get Firebase ID token
      const idToken = await user.getIdToken();

      // 3. Sign in with NextAuth using firebase-token credentials
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
        setError('Sign-in popup was closed. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked. Please allow popups for this site.');
      } else {
        setError('Authentication failed. Please try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm px-4">
      {/* Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#6366f1] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">MediFlow</h1>
          <p className="text-gray-400 text-sm mt-1">AI-Powered Healthcare Navigation</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-xs font-medium text-center">{error}</p>
          </div>
        )}

        {/* Divider text */}
        <p className="text-gray-500 text-xs text-center font-medium mb-4 uppercase tracking-widest">
          Sign in to your account
        </p>

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 font-bold py-3.5 px-4 rounded-2xl shadow-sm transition duration-200 text-sm border border-gray-200"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            /* Google SVG icon */
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {/* Info note */}
        <p className="mt-6 text-gray-600 text-xs text-center leading-relaxed">
          By continuing, you agree to MediFlow's{' '}
          <span className="text-blue-400 cursor-pointer hover:underline">Terms of Service</span>{' '}
          and{' '}
          <span className="text-blue-400 cursor-pointer hover:underline">Privacy Policy</span>.
        </p>

        {/* Back link */}
        <div className="mt-5 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-xs transition">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0f2c] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#3b82f6]/8 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#6366f1]/8 blur-[140px] pointer-events-none" />

      <Suspense fallback={
        <div className="w-full max-w-sm px-4">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
