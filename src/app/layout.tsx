/**
 * Base layout — MediFlow PWA with meta tags and service worker registration
 */
import type { Metadata, Viewport } from 'next';
import type React from 'react';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediFlow — AI-Powered Healthcare Navigation',
  description: 'Intelligent AI-driven healthcare platform for patients, doctors, and administrators.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MediFlow',
    startupImage: '/icons/icon-512x512.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'MediFlow',
    'application-name': 'MediFlow',
    'msapplication-TileColor': '#2ab8d8',
    'msapplication-TileImage': '/icons/icon-144x144.png',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#2ab8d8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
        <meta name="format-detection" content="telephone=no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
              // Prevent PWA standalone mode from breaking out to external Chrome/Safari on cross-subdomain navigation
              document.addEventListener('click', function(e) {
                var anchor = e.target.closest('a');
                if (anchor && anchor.href && anchor.href.indexOf('shanmukhmedisetty.site') !== -1) {
                  if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
                    e.preventDefault();
                    window.location.href = anchor.href;
                  }
                }
              }, false);
            `,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
