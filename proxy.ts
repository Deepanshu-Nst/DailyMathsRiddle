import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/riddle', '/r/', '/practice'];
const AUTH_ROUTES = ['/login'];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Never intercept the OAuth callback or API auth routes
  if (
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do NOT remove this call.
  // It's required to keep the user session alive.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Helper to apply cookies to a redirect response
  const createRedirectResponse = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  };

  // ── Redirect authenticated users away from auth pages ──
  if (user && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return createRedirectResponse(new URL('/', request.url));
  }

  // ── Protect routes that require authentication ──
  if (!user && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname + search);
    if (['/riddle', '/r/', '/practice'].some(prefix => pathname.startsWith(prefix))) {
      url.searchParams.set('reason', 'challenge');
    }
    return createRedirectResponse(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files (*.svg, *.png, *.jpg, *.webp, *.ico)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
