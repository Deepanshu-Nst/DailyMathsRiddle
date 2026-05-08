import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next.js 16 renames middleware.ts → proxy.ts and `middleware` export → `proxy`.

/**
 * Protected route prefixes.
 * Any path starting with one of these requires authentication.
 */
const PROTECTED_PREFIXES = ['/dashboard'];

/**
 * Auth routes — authenticated users are redirected away from these.
 */
const AUTH_ROUTES = ['/login'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh the Supabase session and get current user
  const { supabaseResponse, user } = await updateSession(request);

  // ── Redirect authenticated users away from auth pages ──
  if (user && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ── Protect routes that require authentication ──
  if (!user && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', pathname);
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
