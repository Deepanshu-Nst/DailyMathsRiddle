import type { Metadata } from 'next';
import './globals.css';
import { ChallengeSessionProvider } from '@/components/providers/ChallengeSessionProvider';

export const metadata: Metadata = {
  title: 'AdvaitAI — Daily Math Challenge',
  description: 'A new math challenge every day. Track your streak and progress.',
  openGraph: {
    title: 'AdvaitAI — Daily Math Challenge',
    description: 'Daily math challenges with streak tracking.',
    type: 'website',
  },
};

import { createClient } from '@/utils/supabase/server';
import Header from '@/components/layout/Header';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-text-1 antialiased">
        <ChallengeSessionProvider>
          <Header user={user} profile={profile} />
          {children}
        </ChallengeSessionProvider>
      </body>
    </html>
  );
}
