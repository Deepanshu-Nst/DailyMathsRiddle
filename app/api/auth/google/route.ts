import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextParam = requestUrl.searchParams.get('next');
  
  const supabase = await createClient();
  
  // Dynamic origin detection
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const origin = `${protocol}://${host}`;
  
  // We use a STATIC redirect URL. This is critical for Supabase "Allow List" matching.
  const redirectUrl = new URL('/auth/callback', origin);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl.toString(),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('OAuth initialization error:', error.message);
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'oauth_init_failed');
    return NextResponse.redirect(errorUrl);
  }

  const response = NextResponse.redirect(data.url);

  // Store the deep-link 'next' parameter in a secure cookie.
  // This keeps the OAuth redirectTo parameter static and safe.
  if (nextParam) {
    response.cookies.set('advaitai_next_url', nextParam, {
      path: '/',
      maxAge: 600, // 10 minutes
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  return response;
}
