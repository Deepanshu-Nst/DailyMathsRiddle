import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sign In — AdvaitAI',
  description: 'Sign in to AdvaitAI to track your daily math riddle streak.',
};

const errorMessages: Record<string, string> = {
  oauth_init_failed: 'Could not start sign-in. Please try again.',
  auth_failed: 'Sign-in failed. Please try again.',
  no_code: 'Invalid callback. Please try again.',
  default: 'Something went wrong. Please try again.',
};

/**
 * /login — Google OAuth sign-in page.
 * Pure Server Component — no event handlers, no 'use client'.
 * searchParams is awaited per Next.js 15+ requirement.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  const errorMessage = params.error
    ? (errorMessages[params.error] ?? errorMessages.default)
    : null;

  return (
    <>
      {/* Inline styles for hover effects — no JS needed */}
      <style>{`
        .login-google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: var(--text-1);
          color: var(--bg);
          border-radius: 10px;
          padding: 14px 20px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          text-decoration: none;
          transition:
            transform 140ms var(--ease-out),
            box-shadow 140ms var(--ease-out);
          cursor: pointer;
        }
        .login-google-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 2px 20px rgba(250, 250, 250, 0.12);
        }
        .login-google-btn:active {
          transform: scale(0.98);
        }
        .login-back-link {
          font-size: 13px;
          color: var(--text-4);
          text-decoration: none;
          transition: color 140ms var(--ease-out);
        }
        .login-back-link:hover {
          color: var(--text-2);
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 40,
          }}
        >
          {/* Brand mark */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'var(--text-1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bg)',
                fontSize: 20,
                fontWeight: 800,
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              ∑
            </div>
            <div style={{ textAlign: 'center' }}>
              <h1
                className="font-display"
                style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}
              >
                AdvaitAI
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6 }}>
                Sign in to track your streak and progress.
              </p>
            </div>
          </div>

          {/* Sign-in card */}
          <div
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Error feedback */}
            {errorMessage && (
              <div
                role="alert"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 13,
                  color: 'var(--error)',
                  lineHeight: 1.5,
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Google sign-in button */}
            <a
              href="/api/auth/google"
              id="google-signin-btn"
              className="login-google-btn"
            >
              {/* Google "G" SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </a>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: 'var(--text-4)',
                fontSize: 12,
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span>By signing in, you agree to our terms</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>
          </div>

          {/* Back to app */}
          <Link href="/" className="login-back-link">
            ← Back to daily riddle
          </Link>
        </div>
      </div>
    </>
  );
}
