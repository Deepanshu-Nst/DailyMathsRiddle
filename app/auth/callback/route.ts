import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // Try to get 'next' from cookie first (set in google/route.ts), then from searchParams
  const cookieStore = await cookies();
  const nextCookie = cookieStore.get('advaitai_next_url')?.value;
  let next = nextCookie || requestUrl.searchParams.get('next') || '/';

  // Dynamic origin detection
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const requestOrigin = `${protocol}://${host}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Ensure next is a relative path to prevent open redirect vulnerabilities
      if (next.startsWith('http')) {
        try {
          const nextUrl = new URL(next);
          next = nextUrl.pathname + nextUrl.search;
        } catch {
          next = '/';
        }
      }

      const redirectTo = next.startsWith('/') ? next : '/';
      const response = NextResponse.redirect(`${requestOrigin}${redirectTo}`);
      
      // Clean up the next cookie
      response.cookies.delete('advaitai_next_url');
      
      return response;
    } else {
      console.error('[CALLBACK ERROR]', error.message);
    }
  }

  // Fallback if no code or error
  return NextResponse.redirect(`${requestOrigin}/`);
}
