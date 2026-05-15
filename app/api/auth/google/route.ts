import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextParam = requestUrl.searchParams.get('next');
  
  const supabase = await createClient();
  
  const redirectUrl = new URL('/auth/callback', request.url);
  if (nextParam) {
    redirectUrl.searchParams.set('next', nextParam);
  }

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

  return NextResponse.redirect(data.url);
}
