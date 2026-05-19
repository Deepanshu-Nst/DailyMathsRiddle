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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; reason?: string }>;
}) {
  const params = await searchParams;

  const errorMessage = params.error
    ? (errorMessages[params.error] ?? errorMessages.default)
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="hero-glow" />

      <div className="w-full max-w-sm flex flex-col items-center gap-10 relative z-10">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-[0_0_24px_rgba(108,123,255,0.3)]">
            ∑
          </div>
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-text-1">AdvaitAI</h1>
            <p className="mt-2 text-[14px] text-text-3 leading-relaxed max-w-xs">
              {params.reason === 'challenge'
                ? 'Log in to save progress, streaks, and challenge history.'
                : 'Sign in to track your streak and progress.'}
            </p>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="card w-full p-7 flex flex-col gap-5">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-error/25 bg-error/[0.08] px-4 py-3 text-[13px] text-error leading-relaxed"
            >
              {errorMessage}
            </div>
          )}

          <a
            href={`/api/auth/google${params.next ? `?next=${encodeURIComponent(params.next)}` : ''}`}
            id="google-signin-btn"
            className="btn bg-text-1 text-bg hover:bg-white active:scale-[0.98] transition-all w-full justify-center gap-3 py-3.5 text-[15px] font-semibold rounded-xl no-underline"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </a>

          <div className="flex items-center gap-3 text-text-4">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-[11px] font-medium">By signing in, you agree to our terms</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>
        </div>

        <Link
          href="/"
          className="text-[13px] font-medium text-text-4 hover:text-text-2 transition-colors no-underline"
        >
          ← Back to daily riddle
        </Link>
      </div>
    </div>
  );
}
