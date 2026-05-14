import { createClient } from '@/lib/supabase/server';
import type { DbRiddle, DbRiddleInsert } from '@/types/supabase';

/**
 * All Supabase query operations for the riddles table.
 * Uses service client for writes (bypasses RLS) and anon client for reads.
 */

// ── READ ─────────────────────────────────────────────────────────

/**
 * Fetch a published riddle by its slug.
 * Returns null if not found or not published.
 */
export async function getRiddleBySlug(slug: string): Promise<DbRiddle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('riddles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) return null;
  return data as DbRiddle;
}

/**
 * Fetch the daily riddle for a given date and difficulty.
 * Returns null if not yet generated for this date.
 */
export async function getDailyRiddle(
  date: string,
  difficulty: string
): Promise<DbRiddle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('riddles')
    .select('*')
    .eq('daily_date', date)
    .eq('difficulty', difficulty)
    .eq('is_daily', true)
    .eq('status', 'published')
    .single();

  if (error || !data) return null;
  return data as DbRiddle;
}

/**
 * Fetch the N most recently published riddles.
 * Used by deduplication logic — only question text is needed.
 */
export async function getRecentRiddleQuestions(limit = 50): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('riddles')
    .select('question')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<Array<{ question: string }>>();

  if (error || !data) return [];
  return data.map((r) => r.question);
}

/**
 * Fetch the N most recently used template families.
 * Used by generation pipeline to enforce cooldowns.
 */
export async function getRecentTemplateFamilies(limit = 20): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('riddles')
    .select('template_family')
    .eq('status', 'published')
    .not('template_family', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<Array<{ template_family: string }>>();

  if (error || !data) return [];
  return (data as Array<{ template_family: string }>).map((r) => r.template_family);
}

/**
 * Fetch a riddle by ID — includes answer, for server-side validation only.
 * Uses anon client since RLS allows reading published riddles.
 */
export async function getRiddleById(id: string): Promise<DbRiddle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('riddles')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error || !data) return null;
  return data as DbRiddle;
}

// ── WRITE (service-role only) ─────────────────────────────────────

/**
 * Inserts a new riddle row.
 * Uses service client to bypass RLS.
 * Returns the inserted row.
 */
export async function insertRiddle(payload: DbRiddleInsert): Promise<DbRiddle | null> {
  const { createServiceClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createServiceClient()) as any;

  const { data, error } = await supabase
    .from('riddles')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[riddles/queries] insertRiddle error:', error.message);
    return null;
  }
  return data as DbRiddle;
}

/**
 * Inserts a generation log entry after a successful riddle save.
 * Non-throwing — log failures don't break the generation flow.
 */
export async function insertGenerationLog(opts: {
  userId: string | null;
  sessionId: string | null;
  riddleId: string;
  difficulty: string;
}): Promise<void> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createServiceClient()) as any;
    await supabase.from('generation_logs').insert({
      user_id: opts.userId,
      session_id: opts.sessionId,
      generated_riddle_id: opts.riddleId,
      difficulty: opts.difficulty,
    });
  } catch (err) {
    console.error('[riddles/queries] insertGenerationLog failed:', err);
  }
}

/**
 * Counts how many extra riddles a session generated today.
 * Used for rate limiting.
 */
export async function countTodayGenerations(
  sessionId: string,
  userId: string | null
): Promise<number> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from('generation_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${today}T00:00:00Z`);

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq('session_id', sessionId);
  }

  const { count } = await query;
  return count ?? 0;
}

/**
 * Records an answer attempt.
 * Non-authenticated users can submit with user_id = null.
 */
export async function insertAttempt(opts: {
  userId: string | null;
  riddleId: string;
  submittedAnswer: string;
  isCorrect: boolean;
}): Promise<void> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createServiceClient()) as any;
    await supabase.from('user_attempts').insert({
      user_id: opts.userId,
      riddle_id: opts.riddleId,
      submitted_answer: opts.submittedAnswer,
      is_correct: opts.isCorrect,
    });
  } catch (err) {
    console.error('[riddles/queries] insertAttempt failed:', err);
  }
}

/**
 * Inserts a failed generation log entry for observability.
 * Non-throwing.
 */
export async function insertFailedGeneration(opts: {
  sessionId: string | null;
  userId: string | null;
  difficulty: string;
  model: string;
  rawResponse: string;
  rejectionStage: 'parse_error' | 'structural_rejected' | 'validation_failed' | 'duplicate_rejected';
  rejectionReason: string;
  templateFamily?: string | null;
}): Promise<void> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createServiceClient()) as any;
    await supabase.from('failed_generations').insert({
      session_id: opts.sessionId,
      user_id: opts.userId,
      difficulty: opts.difficulty,
      model: opts.model,
      raw_response: opts.rawResponse,
      rejection_stage: opts.rejectionStage,
      rejection_reason: opts.rejectionReason,
      template_family: opts.templateFamily ?? null,
    });
  } catch (err) {
    console.error('[riddles/queries] insertFailedGeneration failed:', err);
  }
}
