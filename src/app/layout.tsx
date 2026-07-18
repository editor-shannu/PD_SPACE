/**
 * Base layout and configuration for the Next.js app
 */
import type { Metadata } from 'next';
import type React from 'react';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Patient Document Upload',
  description: 'Upload and extract information from medical documents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
