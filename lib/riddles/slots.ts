/**
 * Daily Riddle Slots — Authoritative mapping operations.
 *
 * This module is the ONLY way to read/write the daily_riddle_slots table.
 * The website resolves daily riddles from slots ONLY — never directly from
 * the riddles table's is_daily flag.
 *
 * One day. One difficulty. One active riddle.
 */

import { createClient } from '@/utils/supabase/server';
import type { DbRiddle } from '@/types/supabase';

export interface DailySlot {
  official_date: string;
  difficulty: string;
  riddle_id: string;
  source_type: 'ai' | 'manual' | 'scheduled' | 'emergency';
  is_manual: boolean;
  published_by: string | null;
  published_at: string;
}

// ── READ ─────────────────────────────────────────────────────────

/**
 * Resolves the active riddle for a date+difficulty from the slot table.
 * Returns the full riddle record joined from the riddles table.
 * Returns null if no slot exists.
 */
export async function getSlotRiddle(
  date: string,
  difficulty: string
): Promise<(DbRiddle & { slot_source: string; slot_is_manual: boolean }) | null> {
  const supabase = await createClient();

  const { data, error } = await (supabase
    .from('daily_riddle_slots') as any)
    .select(`
      official_date,
      difficulty,
      riddle_id,
      source_type,
      is_manual,
      published_at,
      riddle:riddles!riddle_id (*)
    `)
    .eq('official_date', date)
    .eq('difficulty', difficulty)
    .maybeSingle();

  if (error || !data || !data.riddle) return null;

  return {
    ...data.riddle,
    slot_source: data.source_type,
    slot_is_manual: data.is_manual,
  };
}

/**
 * Gets all active slots for a given date (all difficulties).
 * Used by admin dashboard and practice exclusion.
 */
export async function getSlotsForDate(
  date: string
): Promise<DailySlot[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase
    .from('daily_riddle_slots') as any)
    .select('*')
    .eq('official_date', date);

  if (error || !data) return [];
  return data as DailySlot[];
}

/**
 * Gets all slot riddle IDs for a date (used for practice exclusion).
 */
export async function getSlotRiddleIds(
  date: string
): Promise<Array<{ riddle_id: string; source_type: string }>> {
  const supabase = await createClient();

  const { data, error } = await (supabase
    .from('daily_riddle_slots') as any)
    .select('riddle_id, source_type')
    .eq('official_date', date);

  if (error || !data) return [];
  return data;
}

// ── WRITE ────────────────────────────────────────────────────────

/**
 * Publishes a riddle into a slot.
 * Uses UPSERT — if a slot already exists:
 *   - Manual overrides AI (is_manual=true replaces is_manual=false)
 *   - AI does NOT override manual (skips if existing slot is manual)
 *
 * Returns { published: true } if the slot was written.
 * Returns { published: false, reason } if skipped.
 */
export async function publishToSlot(opts: {
  date: string;
  difficulty: string;
  riddleId: string;
  sourceType: 'ai' | 'manual' | 'scheduled' | 'emergency';
  isManual: boolean;
  publishedBy?: string | null;
}): Promise<{ published: boolean; reason?: string }> {
  const { createServiceClient } = await import('@/utils/supabase/server');
  const supabase = (await createServiceClient()) as any;

  // Check existing slot
  const { data: existing } = await supabase
    .from('daily_riddle_slots')
    .select('riddle_id, source_type, is_manual')
    .eq('official_date', opts.date)
    .eq('difficulty', opts.difficulty)
    .maybeSingle();

  // If existing slot is manual and new publish is AI, skip
  if (existing?.is_manual && !opts.isManual) {
    console.log(`[slots] Skipped AI publish for ${opts.date}/${opts.difficulty}: manual override exists (${existing.riddle_id})`);
    return { published: false, reason: 'manual_override_exists' };
  }

  // If existing slot has same riddle, no-op
  if (existing?.riddle_id === opts.riddleId) {
    return { published: false, reason: 'already_published' };
  }

  // Upsert the slot
  const { error } = await supabase
    .from('daily_riddle_slots')
    .upsert({
      official_date: opts.date,
      difficulty: opts.difficulty,
      riddle_id: opts.riddleId,
      source_type: opts.sourceType,
      is_manual: opts.isManual,
      published_by: opts.publishedBy ?? null,
      published_at: new Date().toISOString(),
    }, { onConflict: 'official_date,difficulty' });

  if (error) {
    console.error(`[slots] Failed to publish slot for ${opts.date}/${opts.difficulty}:`, error.message);
    return { published: false, reason: error.message };
  }

  const prevInfo = existing ? ` (replaced ${existing.source_type}:${existing.riddle_id})` : '';
  console.log(`[slots] Published ${opts.sourceType}:${opts.riddleId} to ${opts.date}/${opts.difficulty}${prevInfo}`);

  return { published: true };
}

/**
 * Admin override: forces a manual riddle into a slot.
 * Always overwrites, even if a manual slot already exists.
 */
export async function forceManualSlot(opts: {
  date: string;
  difficulty: string;
  riddleId: string;
  publishedBy: string;
}): Promise<{ published: boolean; reason?: string }> {
  const { createServiceClient } = await import('@/utils/supabase/server');
  const supabase = (await createServiceClient()) as any;

  const { error } = await supabase
    .from('daily_riddle_slots')
    .upsert({
      official_date: opts.date,
      difficulty: opts.difficulty,
      riddle_id: opts.riddleId,
      source_type: 'manual',
      is_manual: true,
      published_by: opts.publishedBy,
      published_at: new Date().toISOString(),
    }, { onConflict: 'official_date,difficulty' });

  if (error) {
    console.error(`[slots] Force manual slot failed for ${opts.date}/${opts.difficulty}:`, error.message);
    return { published: false, reason: error.message };
  }

  console.log(`[slots] FORCE MANUAL: ${opts.riddleId} → ${opts.date}/${opts.difficulty}`);
  return { published: true };
}

/**
 * Checks if a manual slot exists for a date+difficulty.
 * Used by cron to skip AI generation when admin has scheduled content.
 */
export async function hasManualSlot(
  date: string,
  difficulty: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await (supabase
    .from('daily_riddle_slots') as any)
    .select('riddle_id')
    .eq('official_date', date)
    .eq('difficulty', difficulty)
    .eq('is_manual', true)
    .maybeSingle();

  return !!data;
}

/**
 * Checks if ANY slot exists for a date+difficulty (manual or AI).
 */
export async function hasSlot(
  date: string,
  difficulty: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await (supabase
    .from('daily_riddle_slots') as any)
    .select('riddle_id')
    .eq('official_date', date)
    .eq('difficulty', difficulty)
    .maybeSingle();

  return !!data;
}
