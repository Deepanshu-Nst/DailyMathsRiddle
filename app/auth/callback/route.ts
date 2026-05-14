import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /auth/callback
 * Supabase OAuth callback — exchanges the ?code= for a persistent session cookie.
 * Google redirects here after the user grants consent.
 *
 * This MUST be a GET handler. Never convert to POST.
 */
export async function GET(request: Request) {
  console.log('[CALLBACK HIT]', request.url);

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const error = searchParams.get('error');

  if (error) {
    console.error('[CALLBACK ERROR from provider]', error);
    return NextResponse.redirect(`${origin}/`);
  }

  if (!code) {
    console.warn('[CALLBACK NO CODE]', searchParams.toString());
    return NextResponse.redirect(`${origin}/`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('[CALLBACK EXCHANGE FAILED]', exchangeError.message);
    return NextResponse.redirect(`${origin}/`);
  }

  console.log('[SESSION EXCHANGED]');

  // Only allow relative redirects to prevent open-redirect attacks
  const redirectTo = next.startsWith('/') ? next : '/';
  console.log('[CALLBACK REDIRECT]', `${origin}${redirectTo}`);
  return NextResponse.redirect(`${origin}${redirectTo}`);
}
