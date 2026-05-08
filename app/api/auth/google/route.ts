import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/google
 * Initiates the Google OAuth flow via Supabase.
 * Redirects the user to Google's consent screen.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error || !data.url) {
    console.error('[auth/google] OAuth initiation error:', error?.message);
    return NextResponse.redirect(new URL('/login?error=oauth_init_failed', origin));
  }

  return NextResponse.redirect(data.url);
}
