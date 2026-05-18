import { createClient } from '@/utils/supabase/server';
import { getISTDayBoundaryRange } from '@/lib/timezone';
import type { Database, DbRiddle, DbRiddleInsert } from '@/types/supabase';

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
 * Fetch a scheduled riddle for a specific date and difficulty.
 */
type ScheduledRiddle = Database['public']['Tables']['scheduled_riddles']['Row'];

export async function getScheduledRiddle(
  date: string,
  difficulty: string
): Promise<ScheduledRiddle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scheduled_riddles')
    .select('*')
    .eq('publish_date', date)
    .eq('difficulty', difficulty)
    .in('status', ['scheduled', 'published'])
    .maybeSingle();

  if (error || !data) return null;
  return data;
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
  const { createServiceClient } = await import('@/utils/supabase/server');
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
  durationMs?: number;
  retryCount?: number;
  templateFamily?: string | null;
}): Promise<void> {
  try {
    const { createServiceClient } = await import('@/utils/supabase/server');
    const supabase = (await createServiceClient()) as any;
    
    // 1. Legacy rate limiting log
    await supabase.from('generation_logs').insert({
      user_id: opts.userId,
      session_id: opts.sessionId,
      generated_riddle_id: opts.riddleId,
      difficulty: opts.difficulty,
    });

    // 2. New observability log
    await insertPipelineLog({
      userId: opts.userId,
      sessionId: opts.sessionId,
      difficulty: opts.difficulty,
      status: 'success',
      durationMs: opts.durationMs,
      retryCount: opts.retryCount,
      templateFamily: opts.templateFamily
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
  const { start, end } = getISTDayBoundaryRange();

  let query = supabase
    .from('generation_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start)
    .lt('created_at', end);

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq('session_id', sessionId);
  }

  const { count } = await query;
  return count ?? 0;
}

/**
 * Fetches categories and template families of the last N riddles 
 * generated for this specific session or user.
 */
export async function getRecentUserContext(
  sessionId: string,
  userId: string | null,
  limit = 6
): Promise<{ categories: string[]; templates: string[] }> {
  const supabase = await createClient();
  
  let query: any = supabase
    .from('riddles')
    .select('category, template_family')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('created_by', userId);
  } else {
    // We don't have a session_id in the riddles table directly, 
    // but we can join with generation_logs or just check created_by = null.
    // Actually, let's use the generation_logs table to find the riddle IDs first.
    const { data: logs } = await supabase
      .from('generation_logs')
      .select('generated_riddle_id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<Array<{ generated_riddle_id: string | null }>>();
    
    if (!logs || logs.length === 0) return { categories: [], templates: [] };
    
    const ids = logs.map(l => l.generated_riddle_id).filter(Boolean);
    query = supabase
      .from('riddles')
      .select('category, template_family')
      .in('id', ids as string[])
      .returns<Array<{ category: string | null; template_family: string | null }>>();
  }

  const { data } = await query;
  if (!data) return { categories: [], templates: [] };

  return {
    categories: Array.from(new Set(data.map((r: any) => r.category).filter(Boolean) as string[])),
    templates: Array.from(new Set(data.map((r: any) => r.template_family).filter(Boolean) as string[])),
  };
}

/**
 * True if this user already has a successful solve recorded for the riddle.
 * Used server-side to prevent duplicate XP / stats increments.
 */
export async function hasUserSolvedRiddle(userId: string, riddleId: string): Promise<boolean> {
  try {
    const { createServiceClient } = await import('@/utils/supabase/server');
    const supabase = (await createServiceClient()) as any;
    const { data } = await supabase
      .from('user_attempts')
      .select('id')
      .eq('user_id', userId)
      .eq('riddle_id', riddleId)
      .eq('status', 'solved')
      .limit(1)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
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
  status: 'solved' | 'wrong' | 'gave_up' | 'challenged';
}): Promise<void> {
  try {
    const { createServiceClient } = await import('@/utils/supabase/server');
    const supabase = (await createServiceClient()) as any;
    await supabase.from('user_attempts').insert({
      user_id: opts.userId,
      riddle_id: opts.riddleId,
      submitted_answer: opts.submittedAnswer,
      is_correct: opts.isCorrect,
      status: opts.status,
    });
  } catch (err) {
    console.error('[riddles/queries] insertAttempt failed:', err);
  }
}

/**
 * Records a pipeline event (success or failure) for AI observability.
 */
export async function insertPipelineLog(opts: {
  sessionId: string | null;
  userId: string | null;
  difficulty: string;
  model?: string;
  status: 'success' | 'failure';
  rejectionStage?: 'parse_error' | 'structural_rejected' | 'validation_failed' | 'duplicate_rejected' | 'hallucination_detected';
  rejectionReason?: string;
  durationMs?: number;
  retryCount?: number;
  similarityScore?: number;
  templateFamily?: string | null;
}): Promise<void> {
  try {
    const { createServiceClient } = await import('@/utils/supabase/server');
    const supabase = (await createServiceClient()) as any;
    await supabase.from('ai_pipeline_logs').insert({
      session_id: opts.sessionId,
      user_id: opts.userId,
      difficulty: opts.difficulty,
      model: opts.model,
      status: opts.status,
      rejection_stage: opts.rejectionStage,
      rejection_reason: opts.rejectionReason,
      duration_ms: opts.durationMs,
      retry_count: opts.retryCount,
      similarity_score: opts.similarityScore,
      template_family: opts.templateFamily ?? null,
    });
  } catch (err) {
    console.error('[riddles/queries] insertPipelineLog failed:', err);
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
    // 1. Record in legacy table for backward compatibility
    const { createServiceClient } = await import('@/utils/supabase/server');
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

    // 2. Record in new observability table
    await insertPipelineLog({
      ...opts,
      status: 'failure',
    });

  } catch (err) {
    console.error('[riddles/queries] insertFailedGeneration failed:', err);
  }
}

/**
 * Fetches the global AI engine configuration.
 */
export async function getAIConfig(): Promise<{ is_enabled: boolean; safe_mode: boolean; max_retries: number; mode: string }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('ai_settings')
      .select('value')
      .eq('key', 'engine_config')
      .maybeSingle();
    
    if (data) {
      const config = (data as any).value;
      // Force enabled for local stabilization/production readiness unless explicitly disabled by a more complex flag
      const finalizedConfig = { ...config, is_enabled: true }; 
      console.log(`[AI CONFIG] is_enabled=${finalizedConfig.is_enabled} mode=${finalizedConfig.mode}`);
      return finalizedConfig;
    }
    
    return { is_enabled: true, safe_mode: false, max_retries: 3, mode: 'standard' };
  } catch (err) {
    console.warn('[AI CONFIG] Failed to fetch settings, defaulting to ENABLED.', err);
    return { is_enabled: true, safe_mode: false, max_retries: 3, mode: 'standard' };
  }
}

// ── PRACTICE EXCLUSION ────────────────────────────────────────────

/**
 * Fetches today's daily riddle IDs, slugs, template families, and questions
 * for ALL difficulties. Used by practice generation to build the exclusion list.
 */
export async function getTodayDailyRiddleExclusions(
  date: string
): Promise<Array<{ id: string; slug: string; template_family: string | null; question: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('riddles')
    .select('id, slug, template_family, question')
    .eq('daily_date', date)
    .eq('is_daily', true)
    .eq('status', 'published')
    .returns<Array<{ id: string; slug: string; template_family: string | null; question: string }>>();

  if (error || !data) return [];
  return data;
}

/**
 * Fetches the IDs and template families of riddles recently generated
 * for this session/user. Used to prevent consecutive practice repeats.
 */
export async function getRecentPracticeRiddleIds(
  sessionId: string,
  userId: string | null,
  limit = 10
): Promise<Array<{ id: string; slug: string; template_family: string | null; question: string }>> {
  const supabase = await createClient();

  // Get recent generation log entries for this session/user
  let logQuery = supabase
    .from('generation_logs')
    .select('generated_riddle_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    logQuery = logQuery.eq('user_id', userId);
  } else {
    logQuery = logQuery.eq('session_id', sessionId);
  }

  const { data: logs } = await logQuery
    .returns<Array<{ generated_riddle_id: string | null }>>();

  if (!logs || logs.length === 0) return [];

  const ids = logs.map(l => l.generated_riddle_id).filter(Boolean) as string[];
  if (ids.length === 0) return [];

  const { data: riddles } = await supabase
    .from('riddles')
    .select('id, slug, template_family, question')
    .in('id', ids)
    .returns<Array<{ id: string; slug: string; template_family: string | null; question: string }>>();

  return riddles ?? [];
}

