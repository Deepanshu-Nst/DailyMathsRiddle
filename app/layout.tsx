import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AdvaitAI — Daily Intelligence Ritual',
  description: 'One curated math challenge every day. Build your streak. Sharpen your mind.',
  openGraph: {
    title: 'AdvaitAI — Daily Intelligence Ritual',
    description: 'One challenge a day. Infinite curiosity.',
    type: 'website',
  },
};

import { getUserProfile } from '@/lib/auth/guards';
import Header from '@/components/layout/Header';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getUserProfile();

  return (
    <html lang="en">
      <body>
        <Header profile={profile} />
        {children}
      </body>
    </html>
  );
}
