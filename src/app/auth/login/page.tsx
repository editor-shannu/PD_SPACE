/**
 * Patient login page
 * Simple email/password form with link to register
 * Mock NextAuth implementation (ready for real setup)
 */

'use client';

import { FormEvent, useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard/patient';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result?.ok) {
        setError(result?.error || 'Invalid credentials. Please try again.');
        setIsLoading(false);
        return;
      }

      // Success - redirect to dashboard
      router.push(callbackUrl);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md px-4">
      <div className="bg-white rounded-[32px] shadow-2xl p-8 border border-blue-50">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#003893] mb-2 tracking-tight">Heal Link</h1>
          <p className="text-gray-500 text-sm">Sign in to your patient dashboard</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-800 text-xs font-semibold">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33aed6] focus:border-transparent outline-none transition disabled:bg-gray-50 text-gray-700"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33aed6] focus:border-transparent outline-none transition disabled:bg-gray-50 text-gray-700"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#003893] hover:bg-[#0b4497] disabled:bg-gray-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition duration-200 mt-8 uppercase text-xs tracking-wider"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Credentials Note */}
        <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-center">
          <p className="text-[#003893] text-xs">
            <span className="font-bold">Demo Mode:</span> Enter any email/password to sign in
          </p>
        </div>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-xs">
            Don't have an account?{' '}
            <Link href="/" className="text-[#33aed6] hover:underline font-bold">
              Go to splash screen
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md flex items-center justify-center p-8 bg-white rounded-lg shadow-lg">
        <div className="text-gray-500 font-medium">Loading form...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
