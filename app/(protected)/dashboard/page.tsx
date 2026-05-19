import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, User, Shield, Mail } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import type { Database } from '@/types/supabase';
import { Container } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const metadata: Metadata = {
  title: 'Dashboard — AdvaitAI',
  description: 'Your AdvaitAI intelligence dashboard.',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  type Profile = Database['public']['Tables']['profiles']['Row'];
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>();

  const displayName =
    profile?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Solver';

  const avatarUrl =
    profile?.avatar_url ??
    (user.user_metadata?.avatar_url as string | undefined) ??
    null;

  const role = profile?.role ?? 'user';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <Container className="min-h-screen flex flex-col items-center py-12 lg:py-20">
      <main className="w-full max-w-lg flex flex-col gap-8">
        {/* Profile card */}
        <Card padding="lg" variant="default" className="flex flex-col sm:flex-row sm:items-center gap-5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-14 h-14 rounded-full border border-border object-cover shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xl font-bold text-text-3 shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-semibold tracking-tight text-text-1 truncate">
                {displayName}
              </h1>
              <Badge
                variant={role === 'admin' ? 'glow' : 'secondary'}
                size="sm"
                className="shrink-0"
              >
                {role}
              </Badge>
            </div>
            <p className="mt-1 text-[13px] text-text-3">
              {user.email}
              {memberSince && <span className="text-text-4"> · Member since {memberSince}</span>}
            </p>
          </div>
        </Card>

        {/* Quick actions */}
        <section className="flex flex-col gap-3">
          <span className="label text-text-4">Quick actions</span>

          <Link
            href="/"
            className="btn btn-primary w-fit text-[15px] py-3.5 px-6 gap-2.5 no-underline"
          >
            Begin today&apos;s ritual
            <ArrowRight size={16} />
          </Link>

          <Link
            href="/streak"
            className="btn btn-ghost w-fit text-[14px] no-underline"
          >
            View streak history →
          </Link>
        </section>

        {/* Account details */}
        <Card variant="default" padding="none" title="Account">
          <div className="divide-y divide-border-subtle">
            {[
              { label: 'User ID', value: user.id, mono: true, icon: <User size={14} /> },
              { label: 'Auth provider', value: 'Google', mono: false, icon: <Shield size={14} /> },
              { label: 'Role', value: role, mono: false, icon: <Shield size={14} /> },
              { label: 'Email verified', value: user.email_confirmed_at ? 'Yes' : 'No', mono: false, icon: <Mail size={14} /> },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-5 py-3.5 gap-4"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-text-4 shrink-0">{row.icon}</span>
                  <span className="text-[13px] text-text-3">{row.label}</span>
                </div>
                <span
                  className="text-[13px] text-text-2 truncate max-w-[220px]"
                  style={{
                    fontVariantNumeric: row.mono ? 'tabular-nums' : undefined,
                    fontFamily: row.mono ? 'var(--font-mono)' : undefined,
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </main>

      <footer className="mt-auto pt-12 pb-8 text-center">
        <span className="text-[13px] text-text-4">
          Built by <span className="text-text-3">AdvaitAI</span> · One challenge a day
        </span>
      </footer>
    </Container>
  );
}
