import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Create the redirect response
      const redirectTo = next.startsWith('/') ? next : '/';
      return NextResponse.redirect(`${origin}${redirectTo}`);
    } else {
      console.error('[CALLBACK ERROR]', error.message);
    }
  }

  // Fallback if no code or error
  return NextResponse.redirect(`${origin}/`);
}
