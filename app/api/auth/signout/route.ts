import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/signout
 * Signs the user out server-side, invalidates the session,
 * clears all auth cookies, and redirects to the homepage.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[auth/signout] Error:', error.message);
  }

  return NextResponse.redirect(new URL('/', origin), { status: 302 });
}
