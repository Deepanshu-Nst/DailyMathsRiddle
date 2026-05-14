import { createServiceClient } from '@/utils/supabase/server';
import { runGenerationPipeline } from '@/lib/generation/pipeline';
import { logAdminAction } from '@/lib/admin/auditLog';

// ── Types ────────────────────────────────────────────────────────

export interface QueueEntry {
  id: string;
  target_date: string;
  difficulty: string;
  riddle_id: string;
  position: number;
  status: 'pending' | 'published' | 'rejected' | 'expired';
  rejected_reason: string | null;
  generated_at: string;
  published_at: string | null;
  riddle?: {
    id: string;
    question: string;
    answer: string;
    explanation: string;
    slug: string;
    category: string;
  };
}

export interface GenerationJob {
  id: string;
  target_date: string;
  difficulty: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  riddle_id: string | null;
  queue_entry_id: string | null;
  error_message: string | null;
  retry_count: number;
  duration_ms: number | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ── Queue Operations ─────────────────────────────────────────────

/**
 * Pre-generates a riddle for a future date and places it in the queue.
 * Returns the generation job record.
 */
export async function preGenerateForDate(
  targetDate: string,
  difficulty: 'easy' | 'medium' | 'hard',
  createdBy?: string | null
): Promise<{ success: boolean; job: GenerationJob | null; error?: string }> {
  const supabase = (await createServiceClient()) as any;
  const startedAt = Date.now();

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('generation_jobs')
    .insert({
      target_date: targetDate,
      difficulty,
      status: 'running',
      created_by: createdBy ?? null,
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (jobError || !job) {
    console.error('[publishPipeline] Failed to create job:', jobError?.message);
    return { success: false, job: null, error: 'Failed to create generation job' };
  }

  try {
    // Run the generation pipeline — produces a real riddle in the DB
    const result = await runGenerationPipeline({
      difficulty,
      isDaily: true,
      dailyDate: targetDate,
    });

    const durationMs = Date.now() - startedAt;

    if (!result.success) {
      // Mark job as failed
      await supabase
        .from('generation_jobs')
        .update({
          status: 'failed',
          error_message: result.error,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      return { success: false, job: { ...job, status: 'failed', error_message: result.error }, error: result.error };
    }

    // Add riddle to queue
    const { data: queueEntry } = await supabase
      .from('daily_riddle_queue')
      .insert({
        target_date: targetDate,
        difficulty,
        riddle_id: result.riddle.id,
        position: 0,
        status: 'pending',
      })
      .select('*')
      .single();

    // Update job as completed
    await supabase
      .from('generation_jobs')
      .update({
        status: 'completed',
        riddle_id: result.riddle.id,
        queue_entry_id: queueEntry?.id ?? null,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    console.log(`[publishPipeline] Generated riddle ${result.riddle.id} for ${targetDate} (${difficulty}) in ${durationMs}ms`);

    return {
      success: true,
      job: { ...job, status: 'completed', riddle_id: result.riddle.id, duration_ms: durationMs },
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : String(err);

    await supabase
      .from('generation_jobs')
      .update({
        status: 'failed',
        error_message: msg,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return { success: false, job: { ...job, status: 'failed', error_message: msg }, error: msg };
  }
}

/**
 * Fetches queue entries for a date, optionally filtered by status.
 */
export async function getQueueForDate(
  date: string,
  status?: 'pending' | 'published' | 'rejected' | 'expired'
): Promise<QueueEntry[]> {
  const supabase = (await createServiceClient()) as any;

  let query = supabase
    .from('daily_riddle_queue')
    .select('*, riddle:riddles!riddle_id(id, question, answer, explanation, slug, category)')
    .eq('target_date', date)
    .order('position', { ascending: true });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    console.error('[publishPipeline] Failed to fetch queue:', error.message);
    return [];
  }
  return (data ?? []) as QueueEntry[];
}

/**
 * Promotes the top-priority pending queue entry to the live riddles table.
 * The riddle already exists in the riddles table (created during generation),
 * so this just marks it as the daily riddle and updates the queue entry.
 */
export async function publishFromQueue(
  date: string,
  difficulty: 'easy' | 'medium' | 'hard',
  actorId?: string
): Promise<{ success: boolean; riddleId?: string; error?: string }> {
  const supabase = (await createServiceClient()) as any;

  // Find top pending entry
  const { data: entry, error: fetchError } = await supabase
    .from('daily_riddle_queue')
    .select('*')
    .eq('target_date', date)
    .eq('difficulty', difficulty)
    .eq('status', 'pending')
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError || !entry) {
    return { success: false, error: 'No pending queue entry found for this date and difficulty.' };
  }

  // Mark queue entry as published
  await supabase
    .from('daily_riddle_queue')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', entry.id);

  // Ensure the riddle is marked as daily + published
  await supabase
    .from('riddles')
    .update({ is_daily: true, daily_date: date, status: 'published' })
    .eq('id', entry.riddle_id);

  // Log audit
  if (actorId) {
    await logAdminAction({
      actorId,
      action: 'publish',
      targetType: 'queue_entry',
      targetId: entry.id,
      metadata: { riddle_id: entry.riddle_id, target_date: date, difficulty },
    });
  }

  console.log(`[publishPipeline] Published riddle ${entry.riddle_id} for ${date} (${difficulty})`);
  return { success: true, riddleId: entry.riddle_id };
}

/**
 * Rejects a queue entry with a reason.
 */
export async function rejectQueueEntry(
  entryId: string,
  reason: string,
  actorId: string
): Promise<{ success: boolean }> {
  const supabase = (await createServiceClient()) as any;

  const { error } = await supabase
    .from('daily_riddle_queue')
    .update({ status: 'rejected', rejected_reason: reason })
    .eq('id', entryId);

  if (error) {
    console.error('[publishPipeline] Failed to reject entry:', error.message);
    return { success: false };
  }

  await logAdminAction({
    actorId,
    action: 'reject',
    targetType: 'queue_entry',
    targetId: entryId,
    metadata: { reason },
  });

  return { success: true };
}

/**
 * Replaces the current live riddle for a date+difficulty.
 * The old riddle is un-dailied; the new one is promoted.
 */
export async function replaceCurrentLive(
  date: string,
  difficulty: 'easy' | 'medium' | 'hard',
  newRiddleId: string,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = (await createServiceClient()) as any;

  // Find the current live riddle
  const { data: current } = await supabase
    .from('riddles')
    .select('id')
    .eq('daily_date', date)
    .eq('difficulty', difficulty)
    .eq('is_daily', true)
    .eq('status', 'published')
    .maybeSingle();

  const previousRiddleId = current?.id;

  // Un-daily the old one
  if (previousRiddleId) {
    await supabase
      .from('riddles')
      .update({ is_daily: false })
      .eq('id', previousRiddleId);
  }

  // Promote the new one
  await supabase
    .from('riddles')
    .update({ is_daily: true, daily_date: date, status: 'published' })
    .eq('id', newRiddleId);

  await logAdminAction({
    actorId,
    action: 'replace',
    targetType: 'riddle',
    targetId: newRiddleId,
    metadata: { previous_riddle_id: previousRiddleId, date, difficulty },
  });

  return { success: true };
}

/**
 * Rolls back the current live riddle to the previous version.
 * Uses the audit log to find the previous riddle.
 */
export async function rollbackChallenge(
  date: string,
  difficulty: 'easy' | 'medium' | 'hard',
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = (await createServiceClient()) as any;

  // Find the most recent replace action for this date
  const { data: auditEntry } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .eq('action', 'replace')
    .eq('target_type', 'riddle')
    .order('created_at', { ascending: false })
    .limit(10);

  const relevantEntry = (auditEntry ?? []).find(
    (e: any) => e.metadata?.date === date && e.metadata?.difficulty === difficulty
  );

  if (!relevantEntry?.metadata?.previous_riddle_id) {
    return { success: false, error: 'No previous version found for rollback.' };
  }

  const previousId = relevantEntry.metadata.previous_riddle_id;
  const currentId = relevantEntry.target_id;

  // Un-daily the current
  await supabase.from('riddles').update({ is_daily: false }).eq('id', currentId);

  // Re-daily the previous
  await supabase
    .from('riddles')
    .update({ is_daily: true, daily_date: date, status: 'published' })
    .eq('id', previousId);

  await logAdminAction({
    actorId,
    action: 'rollback',
    targetType: 'riddle',
    targetId: previousId,
    metadata: { rolled_back_from: currentId, date, difficulty },
  });

  return { success: true };
}

/**
 * Force-publishes a specific riddle as the daily for a given date.
 */
export async function manualPublish(
  riddleId: string,
  date: string,
  difficulty: 'easy' | 'medium' | 'hard',
  actorId: string
): Promise<{ success: boolean }> {
  const supabase = (await createServiceClient()) as any;

  // Un-daily any existing riddle for this slot
  await supabase
    .from('riddles')
    .update({ is_daily: false })
    .eq('daily_date', date)
    .eq('difficulty', difficulty)
    .eq('is_daily', true);

  // Promote the specified riddle
  await supabase
    .from('riddles')
    .update({ is_daily: true, daily_date: date, status: 'published' })
    .eq('id', riddleId);

  await logAdminAction({
    actorId,
    action: 'manual_publish',
    targetType: 'riddle',
    targetId: riddleId,
    metadata: { date, difficulty },
  });

  return { success: true };
}

/**
 * Regenerates queue candidates for a date by running the pipeline again.
 */
export async function regenerateQueue(
  date: string,
  difficulty: 'easy' | 'medium' | 'hard',
  actorId: string
): Promise<{ success: boolean; job: GenerationJob | null; error?: string }> {
  const result = await preGenerateForDate(date, difficulty, actorId);

  if (result.success) {
    await logAdminAction({
      actorId,
      action: 'regenerate',
      targetType: 'queue_entry',
      targetId: result.job?.id ?? 'unknown',
      metadata: { date, difficulty },
    });
  }

  return result;
}

/**
 * Retries a previously failed generation job.
 */
export async function retryFailedJob(
  jobId: string,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = (await createServiceClient()) as any;

  const { data: job } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (!job || job.status !== 'failed') {
    return { success: false, error: 'Job not found or not in failed state.' };
  }

  // Increment retry count
  await supabase
    .from('generation_jobs')
    .update({ retry_count: (job.retry_count ?? 0) + 1 })
    .eq('id', jobId);

  const result = await preGenerateForDate(job.target_date, job.difficulty, actorId);
  return { success: result.success, error: result.error };
}

// ── Read Operations ──────────────────────────────────────────────

/**
 * Fetches generation jobs, ordered newest first.
 */
export async function getGenerationJobs(opts?: {
  status?: string;
  targetDate?: string;
  limit?: number;
}): Promise<GenerationJob[]> {
  const supabase = (await createServiceClient()) as any;

  let query = supabase
    .from('generation_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50);

  if (opts?.status) query = query.eq('status', opts.status);
  if (opts?.targetDate) query = query.eq('target_date', opts.targetDate);

  const { data, error } = await query;
  if (error) {
    console.error('[publishPipeline] Failed to fetch jobs:', error.message);
    return [];
  }
  return (data ?? []) as GenerationJob[];
}

/**
 * Fetches all queue entries, ordered by date then position.
 */
export async function getQueueEntries(opts?: {
  status?: string;
  limit?: number;
}): Promise<QueueEntry[]> {
  const supabase = (await createServiceClient()) as any;

  let query = supabase
    .from('daily_riddle_queue')
    .select('*, riddle:riddles!riddle_id(id, question, answer, explanation, slug, category)')
    .order('target_date', { ascending: false })
    .order('position', { ascending: true })
    .limit(opts?.limit ?? 50);

  if (opts?.status) query = query.eq('status', opts.status);

  const { data, error } = await query;
  if (error) {
    console.error('[publishPipeline] Failed to fetch queue entries:', error.message);
    return [];
  }
  return (data ?? []) as QueueEntry[];
}
