import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

/**
 * Server-side Supabase client.
 * Use in: Server Components, Route Handlers, Server Actions.
 * Reads/writes cookies via Next.js `cookies()` for session persistence.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can be called from Server Components where cookies are read-only.
            // This is safe to ignore — the middleware handles cookie rotation.
          }
        },
      },
    }
  );
}

/**
 * Service-role server client — ACTUALLY bypasses RLS.
 *
 * Uses raw @supabase/supabase-js createClient, NOT @supabase/ssr.
 * The SSR createServerClient applies RLS even with the service role key.
 * Only the raw client with auth.persistSession=false truly bypasses RLS.
 *
 * NEVER expose to the browser. Use ONLY in trusted Route Handlers.
 */
export async function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.');
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
