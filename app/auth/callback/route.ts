import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  // Dynamic origin detection
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const requestOrigin = `${protocol}://${host}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Create the redirect response
      const redirectTo = next.startsWith('/') ? next : '/';
      return NextResponse.redirect(`${requestOrigin}${redirectTo}`);
    } else {
      console.error('[CALLBACK ERROR]', error.message);
    }
  }

  // Fallback if no code or error
  return NextResponse.redirect(`${requestOrigin}/`);
}
