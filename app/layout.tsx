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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
