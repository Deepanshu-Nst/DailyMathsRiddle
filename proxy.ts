import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next.js 16 renames middleware.ts → proxy.ts and `middleware` export → `proxy`.

/**
 * Protected route prefixes.
 * Any path starting with one of these requires authentication.
 */
const PROTECTED_PREFIXES = ['/dashboard', '/admin'];

/**
 * Auth routes — authenticated users are redirected away from these.
 */
const AUTH_ROUTES = ['/login'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh the Supabase session and get current user
  const { supabaseResponse, user } = await updateSession(request);

  // Never intercept the OAuth callback or API auth routes —
  // they need to run without session checks to exchange the code.
  if (
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api/auth/')
  ) {
    return supabaseResponse;
  }

  // ── Redirect authenticated users away from auth pages ──
  if (user && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ── Protect routes that require authentication ──
  if (!user && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
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
