import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

/**
 * Browser-side Supabase client.
 * Use this ONLY in Client Components ('use client').
 * A new instance is created each call — safe because @supabase/ssr
 * internally deduplicates via a singleton per window.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
