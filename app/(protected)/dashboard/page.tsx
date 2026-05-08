import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/requireUser';
import { getCurrentProfile } from '@/lib/auth/getProfile';
import { loadStreakData } from '@/lib/streak-engine';

export const metadata: Metadata = {
  title: 'Dashboard — AdvaitAI',
  description: 'Your AdvaitAI intelligence dashboard.',
};

/**
 * /dashboard — Authenticated user home.
 * Shows: profile info, role badge, streak summary, CTA to start riddle.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  // Display name: prefer profile full_name → user metadata → email prefix
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
    <div
      style={{
        minHeight: '100vh',
        padding: '0 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          width: '100%',
          maxWidth: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '28px 0 0',
        }}
      >
        <a
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 7,
              background: 'var(--text-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--bg)',
              fontSize: 15,
              fontWeight: 800,
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            ∑
          </div>
          <span
            className="font-display"
            style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            AdvaitAI
          </span>
        </a>

        {/* Sign out */}
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            id="signout-btn"
            className="btn btn-ghost"
            style={{ fontSize: 13 }}
          >
            Sign out
          </button>
        </form>
      </nav>

      {/* Main */}
      <main
        style={{
          width: '100%',
          maxWidth: 640,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          padding: 'clamp(48px, 8vh, 80px) 0 80px',
        }}
      >
        {/* Profile card */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '28px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          {/* Avatar */}
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              width={56}
              height={56}
              style={{ borderRadius: '50%', border: '1px solid var(--border)', flexShrink: 0 }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text-2)',
                fontFamily: "'Bricolage Grotesque', sans-serif",
                flexShrink: 0,
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 4,
                flexWrap: 'wrap',
              }}
            >
              <span
                className="font-display"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </span>

              {/* Role badge */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: role === 'admin' ? 'rgba(250,250,250,0.12)' : 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: role === 'admin' ? 'var(--text-1)' : 'var(--text-3)',
                  flexShrink: 0,
                }}
              >
                {role}
              </span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              {user.email}
              {memberSince && (
                <span style={{ color: 'var(--text-4)' }}> · Member since {memberSince}</span>
              )}
            </p>
          </div>
        </div>

        {/* Section: Quick actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <span className="label">Quick actions</span>

          <a
            href="/"
            id="start-riddle-cta"
            className="btn btn-primary"
            style={{ fontSize: 15, padding: '14px 24px', textDecoration: 'none', width: 'fit-content' }}
          >
            Begin today&apos;s ritual
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>

          <a
            href="/streak"
            className="btn btn-ghost"
            style={{ fontSize: 14, width: 'fit-content', textDecoration: 'none' }}
          >
            View streak history →
          </a>
        </div>

        {/* Section: Account info */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="label">Account</span>
          </div>
          <div style={{ padding: '0' }}>
            {[
              { label: 'User ID', value: user.id, mono: true },
              { label: 'Auth provider', value: 'Google', mono: false },
              { label: 'Role', value: role, mono: false },
              { label: 'Email verified', value: user.email_confirmed_at ? 'Yes' : 'No', mono: false },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  gap: 16,
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{row.label}</span>
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--text-2)',
                    fontVariantNumeric: row.mono ? 'tabular-nums' : undefined,
                    fontFamily: row.mono ? 'monospace' : undefined,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 220,
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer style={{ paddingBottom: 32, textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-4)' }}>
          Built by <span style={{ color: 'var(--text-3)' }}>AdvaitAI</span> · One challenge a day
        </span>
      </footer>
    </div>
  );
}
