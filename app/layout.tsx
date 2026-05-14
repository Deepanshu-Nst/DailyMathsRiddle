import type { Metadata } from 'next';
import './globals.css';
import { ChallengeSessionProvider } from '@/components/providers/ChallengeSessionProvider';

export const metadata: Metadata = {
  title: 'AdvaitAI — Daily Intelligence Ritual',
  description: 'One curated math challenge every day. Build your streak. Sharpen your mind.',
  openGraph: {
    title: 'AdvaitAI — Daily Intelligence Ritual',
    description: 'One challenge a day. Infinite curiosity.',
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
    <html lang="en">
      <body>
        <ChallengeSessionProvider>
          <Header user={user} profile={profile} />
          {children}
        </ChallengeSessionProvider>
      </body>
    </html>
  );
}
