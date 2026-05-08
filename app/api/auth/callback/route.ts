import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/callback
 * OAuth redirect handler — exchanges the authorization code for a session.
 * Supabase + Google both redirect here after the user grants consent.
 *
 * On success  → redirects to /dashboard (or ?next= param)
 * On failure  → redirects to /login?error=...
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');

  // If Google or Supabase returned an error
  if (error) {
    console.error('[auth/callback] Provider error:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', origin));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('[auth/callback] Code exchange error:', exchangeError.message);
    return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
  }

  // Sanitise the `next` param — only allow relative paths
  const redirectTo = next.startsWith('/') ? next : '/dashboard';
  return NextResponse.redirect(new URL(redirectTo, origin));
}
