/**
 * Dashboard layout for protected routes
 * Custom styled header, navigation, and bottom navigation bar following the Heal Link visual theme
 */

'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  const navItems = [
    {
      name: 'Home',
      href: '/dashboard/patient',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Documents',
      href: '/dashboard/patient/documents',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      name: 'AI Upload',
      href: '/dashboard/patient/upload',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex-shrink-0">
              <Link href="/dashboard/patient" className="text-2xl font-black text-[#003893] tracking-tight">
                Heal Link
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`text-sm font-bold tracking-wide transition-all ${
                      isActive ? 'text-[#33aed6]' : 'text-gray-500 hover:text-[#003893]'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right User Controls */}
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-900">{session?.user?.name}</p>
                <p className="text-[10px] text-gray-400 font-bold">{session?.user?.email}</p>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition uppercase tracking-wider border border-gray-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Bottom Navigation Bar for Mobile Devices (matching the mockup exactly) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-50 px-6 py-2">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {/* Home Icon */}
          <Link
            href="/dashboard/patient"
            className={`flex flex-col items-center p-2 rounded-xl transition ${
              pathname === '/dashboard/patient' ? 'text-[#003893]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {navItems[0].icon}
            <span className="text-[9px] font-bold mt-0.5">Home</span>
          </Link>

          {/* Documents/Book Icon */}
          <Link
            href="/dashboard/patient/documents"
            className={`flex flex-col items-center p-2 rounded-xl transition ${
              pathname === '/dashboard/patient/documents' ? 'text-[#003893]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {navItems[1].icon}
            <span className="text-[9px] font-bold mt-0.5">Docs</span>
          </Link>

          {/* AI Robot/Upload Icon */}
          <Link
            href="/dashboard/patient/upload"
            className={`flex flex-col items-center p-2 rounded-xl transition ${
              pathname === '/dashboard/patient/upload' ? 'text-[#003893]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {navItems[2].icon}
            <span className="text-[9px] font-bold mt-0.5">AI</span>
          </Link>

          {/* Notifications Icon (Mock) */}
          <button
            onClick={() => alert('No new notifications')}
            className="flex flex-col items-center p-2 text-gray-400 hover:text-gray-600 rounded-xl transition"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-[9px] font-bold mt-0.5">Alerts</span>
          </button>

          {/* Settings Icon (Log out trigger) */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center p-2 text-gray-400 hover:text-gray-600 rounded-xl transition"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[9px] font-bold mt-0.5">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
