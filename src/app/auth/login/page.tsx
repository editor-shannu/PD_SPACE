/**
 * MediFlow — Login Page
 * - Uses redirect-based Google sign-in on mobile (popups blocked by mobile browsers)
 * - Falls back to popup on desktop
 * - Full PWA-ready mobile layout with install prompt
 * - Scrollable, no-overlap mobile layout
 */

'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { signIn } from 'next-auth/react';
import { auth, googleProvider } from '@/lib/firebase';
import Link from 'next/link';

/** Detect if the user is on a mobile device */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function LoginForm() {
  const router     = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get('callbackUrl') || '/dashboard/patient';

  const [error,     setError]     = useState('');
  const [isLoading, setLoading]   = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);

  // Handle PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  // Handle the redirect result when the user returns from Google sign-in redirect
  useEffect(() => {
    const processRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          setLoading(true);
          const user = result.user;
          const nextAuthResult = await signIn('credentials', {
            email:    user.email    ?? '',
            name:     user.displayName ?? user.email?.split('@')[0] ?? 'Patient',
            image:    user.photoURL ?? '',
            uid:      user.uid      ?? '',
            redirect: false,
            callbackUrl,
          });

          if (!nextAuthResult?.ok) {
            setError('Sign-in failed. Please try again.');
            setLoading(false);
            setIsProcessingRedirect(false);
            return;
          }
          window.location.href = callbackUrl;
          return;
        }
      } catch (err: any) {
        if (err.code !== 'auth/no-auth-event') {
          setError(err.message || 'Google sign-in failed. Please try again.');
        }
      }
      setIsProcessingRedirect(false);
    };
    processRedirectResult();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowInstall(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      if (isMobileDevice()) {
        // Mobile: use redirect (popups are blocked on mobile browsers)
        await signInWithRedirect(auth, googleProvider);
        // Execution will stop here; Google redirects the browser back to this page
        return;
      } else {
        // Desktop: use popup
        const result      = await signInWithPopup(auth, googleProvider);
        const user        = result.user;
        const nextAuthResult = await signIn('credentials', {
          email:    user.email    ?? '',
          name:     user.displayName ?? user.email?.split('@')[0] ?? 'Patient',
          image:    user.photoURL ?? '',
          uid:      user.uid      ?? '',
          redirect: false,
          callbackUrl,
        });

        if (!nextAuthResult?.ok) {
          setError('Sign-in failed. Please try again.');
          setLoading(false);
          return;
        }
        window.location.href = callbackUrl;
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        // Popup was blocked — fall back to redirect
        setError('');
        await signInWithRedirect(auth, googleProvider);
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Check your internet connection.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
      setLoading(false);
    }
  };

  // Show loading spinner while processing redirect result
  if (isProcessingRedirect || (isLoading && typeof window !== 'undefined' && window.sessionStorage.getItem('googleRedirectPending'))) {
    return (
      <div className="min-h-screen w-full bg-[#2ab8d8] flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-[18px] bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-xl">
          <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
          </svg>
        </div>
        <div className="h-8 w-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white font-semibold text-sm">Completing sign-in...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#2ab8d8] flex items-start justify-center overflow-y-auto">
      {/* Card: full-screen on mobile, phone-width card on desktop */}
      <div className="w-full md:max-w-sm md:my-8 md:rounded-[40px] md:overflow-hidden md:shadow-2xl flex flex-col">

        {/* ── PWA Install Banner ────────────────────────── */}
        {showInstall && (
          <div className="bg-[#003893] px-4 py-3 flex items-center justify-between gap-3 md:rounded-t-[40px]">
            <div className="flex items-center gap-2">
              <span className="text-lg">📲</span>
              <div>
                <p className="text-white text-xs font-bold leading-tight">Install MediFlow App</p>
                <p className="text-white/70 text-[10px]">Add to home screen for instant access</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleInstallApp}
                className="px-3 py-1.5 bg-white text-[#003893] rounded-xl text-[10px] font-black transition hover:bg-blue-50"
              >
                Install
              </button>
              <button
                onClick={() => setShowInstall(false)}
                className="text-white/60 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── Top: Teal brand area ─────────────────────── */}
        <div className="relative bg-[#2ab8d8] flex flex-col items-center justify-center px-6 py-10 overflow-hidden min-h-[200px]">
          {/* Decorative blobs */}
          <div className="absolute top-[-40px] left-[-40px] w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute bottom-[-20px] right-[-30px] w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute top-6 right-8 w-12 h-12 rounded-full bg-white/10 pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 w-[72px] h-[72px] rounded-[22px] bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-xl mb-4">
            <svg className="h-9 w-9 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
            </svg>
          </div>
          <h1 className="relative z-10 text-3xl font-black text-white tracking-tight drop-shadow">MediFlow</h1>
          <p className="relative z-10 text-white/80 text-sm font-medium mt-1">AI-Powered Healthcare Navigation</p>
        </div>

        {/* ── Bottom: White form area ──────────────────── */}
        <div className="bg-white rounded-t-[36px] md:rounded-none px-6 sm:px-8 pt-7 pb-10 flex flex-col items-center gap-4 w-full">

          <p className="text-gray-400 font-semibold text-xs uppercase tracking-widest">Sign in to your account</p>

          {/* Error banner */}
          {error && (
            <div className="w-full bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-start gap-2">
              <span className="text-red-400 mt-0.5 flex-shrink-0">⚠️</span>
              <p className="text-red-500 text-xs font-medium leading-relaxed">{error}</p>
              <button onClick={() => setError('')} className="ml-auto text-red-300 hover:text-red-500 text-xs flex-shrink-0">✕</button>
            </div>
          )}

          {/* Credentials Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setLoading(true);
              const target   = e.target as any;
              const email    = target.email.value.trim();
              const password = target.password.value;

              if (!email || !password) {
                setError('Email and Password are required.');
                setLoading(false);
                return;
              }

              try {
                const nextAuthResult = await signIn('credentials', {
                  email,
                  password,
                  redirect: false,
                  callbackUrl,
                });

                if (!nextAuthResult?.ok) {
                  setError(nextAuthResult?.error || 'Invalid email or password. Please try again.');
                  setLoading(false);
                  return;
                }

                const emailLower = email.toLowerCase().trim();
                if (emailLower === 'mediflow@test.com' || emailLower === 'heallink.care@gmail.com') {
                  window.location.href = '/dashboard/admin';
                } else {
                  window.location.href = callbackUrl;
                }
              } catch (err: any) {
                setError(err.message || 'Authentication failed. Please try again.');
                setLoading(false);
              }
            }}
            className="w-full flex flex-col gap-3"
          >
            <div className="w-full">
              <label className="block text-gray-400 font-bold text-[10px] uppercase mb-1 ml-1">Email Address</label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="your@email.com"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white text-gray-700 transition"
              />
            </div>
            <div className="w-full">
              <label className="block text-gray-400 font-bold text-[10px] uppercase mb-1 ml-1">Password</label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white text-gray-700 transition"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#2ab8d8] hover:bg-[#209bb6] active:scale-[0.98] disabled:bg-gray-300 text-white font-bold py-3.5 rounded-2xl shadow transition duration-200 text-sm mt-1 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In with Credentials'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="w-full flex items-center gap-3">
            <div className="h-[1px] bg-gray-100 flex-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">or</span>
            <div className="h-[1px] bg-gray-100 flex-1" />
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-[#003893] hover:bg-[#0b4497] active:scale-[0.98] disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 transition-all duration-200 text-sm"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
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

          {/* iOS PWA tip */}
          <div className="w-full bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-2.5">
            <span className="text-blue-400 text-base flex-shrink-0 mt-0.5">📱</span>
            <div>
              <p className="text-blue-700 text-[10px] font-bold uppercase tracking-wide mb-0.5">Install as App</p>
              <p className="text-blue-600 text-[10px] leading-relaxed">
                <strong>Android:</strong> Tap the browser menu → &quot;Add to Home Screen&quot;<br />
                <strong>iOS Safari:</strong> Tap Share <span className="text-xs">⎙</span> → &quot;Add to Home Screen&quot;
              </p>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="w-full space-y-2">
              <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">Dev Bypasses</p>
              <button
                type="button"
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  try {
                    const res = await signIn('credentials', {
                      email:    'test-patient@mediflow.care',
                      name:     'Test Patient',
                      image:    '',
                      uid:      'dev-patient-123',
                      redirect: false,
                      callbackUrl,
                    });
                    if (!res?.ok) { setError('Bypass failed'); setLoading(false); return; }
                    window.location.href = callbackUrl;
                  } catch (err: any) { setError(err.message); setLoading(false); }
                }}
                disabled={isLoading}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-bold rounded-2xl text-xs transition"
              >
                🧪 Patient Dev Bypass
              </button>
              <button
                type="button"
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  try {
                    const res = await signIn('credentials', {
                      email: 'heallink.care@gmail.com', name: 'Admin User', image: '', uid: 'dev-admin-123', redirect: false, callbackUrl: '/dashboard/admin',
                    });
                    if (!res?.ok) { setError('Bypass failed'); setLoading(false); return; }
                    window.location.href = '/dashboard/admin';
                  } catch (err: any) { setError(err.message); setLoading(false); }
                }}
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold rounded-2xl text-xs transition"
              >
                🛡️ Admin Dev Bypass
              </button>
            </div>
          )}

          <p className="text-gray-400 text-xs text-center leading-relaxed">
            By continuing, you agree to MediFlow&apos;s{' '}
            <span className="text-[#003893] font-semibold cursor-pointer hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-[#003893] font-semibold cursor-pointer hover:underline">Privacy Policy</span>.
          </p>

          <Link href="/" className="text-gray-400 text-sm hover:text-[#2ab8d8] transition pb-2">
            ← Back to home
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#2ab8d8] flex items-center justify-center">
          <div className="text-white font-semibold text-sm">Loading MediFlow...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
