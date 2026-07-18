/**
 * MediFlow — Dashboard Layout
 * Apple glassmorphism: light frosted panels on teal/blue gradient background
 * Consistent with splash/login teal (#2ab8d8) brand
 */

'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import type React from 'react';
import Image from 'next/image';

const navItems = [
  {
    name: 'Home',
    href: '/dashboard/patient',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Upload',
    href: '/dashboard/patient/upload',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    name: 'Timeline',
    href: '/dashboard/patient/documents',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    name: 'Reminders',
    href: '/dashboard/patient/reminders',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  const userInitial = session?.user?.name?.charAt(0).toUpperCase()
    || session?.user?.email?.charAt(0).toUpperCase()
    || 'M';

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#e8f4f8] via-[#f0f8fc] to-[#f5fbff] flex flex-col">
      {/* ─── Top Header (Glassmorphic) ──────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Brand */}
            <Link href="/dashboard/patient" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#2ab8d8] flex items-center justify-center shadow-md shadow-[#2ab8d8]/30">
                <svg className="h-4.5 w-4.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
                </svg>
              </div>
              <span className="text-lg font-black text-[#003893] tracking-tight">MediFlow</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#2ab8d8]/15 text-[#2ab8d8]'
                        : 'text-gray-500 hover:text-[#003893] hover:bg-gray-100/60'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User + Logout */}
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="flex items-center gap-2.5">
                {session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt="Profile"
                    width={34}
                    height={34}
                    className="w-8 h-8 rounded-full border-2 border-[#2ab8d8]/30 shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#2ab8d8] flex items-center justify-center text-white text-xs font-black shadow-md shadow-[#2ab8d8]/30">
                    {userInitial}
                  </div>
                )}
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-[#003893] leading-none">{session?.user?.name || 'Patient'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{session?.user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-[#003893] bg-gray-100/80 hover:bg-gray-200/80 rounded-xl transition border border-gray-200/60 backdrop-blur-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Page Content ───────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-10">
        {children}
      </main>

      {/* ─── Bottom Nav — Mobile (Glassmorphic) ─────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-t border-white/80 shadow-lg">
        <div className="flex justify-around items-center h-16 px-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isActive ? 'text-[#2ab8d8]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {item.icon}
                <span className="text-[9px] font-bold uppercase tracking-wider">{item.name}</span>
              </Link>
            );
          })}
          {/* Sign Out */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 px-3 py-2 text-gray-400 hover:text-gray-600 rounded-xl transition"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-wider">Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
