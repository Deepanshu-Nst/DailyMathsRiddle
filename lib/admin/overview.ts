import { createServiceClient } from '@/utils/supabase/server';
import type { PipelineEventType, PipelineStats } from '@/types/analytics';

export interface AdminCounts {
  profiles: number;
  publishedRiddles: number;
  solvedAttempts: number;
}

export interface AdminOverview {
  counts: AdminCounts;
  pipeline: PipelineStats | null;
  pipelineError: string | null;
}

/**
 * Aggregated admin metrics from Supabase (service role).
 * Used by the admin dashboard and /api/admin/stats.
 */
export async function getAdminOverview(days: number): Promise<AdminOverview> {
  const supabase = (await createServiceClient()) as any;

  const [profilesRes, riddlesRes, attemptsRes] = await Promise.all([
    supabase.from('profiles').select('*', { head: true, count: 'exact' }),
    supabase.from('riddles').select('*', { head: true, count: 'exact' }).eq('status', 'published'),
    supabase.from('user_attempts').select('*', { head: true, count: 'exact' }).eq('status', 'solved'),
  ]);

  const counts: AdminCounts = {
    profiles: profilesRes.count ?? 0,
    publishedRiddles: riddlesRes.count ?? 0,
    solvedAttempts: attemptsRes.count ?? 0,
  };

  const from = new Date(Date.now() - days * 86_400_000).toISOString();
  const to = new Date().toISOString();

  const { data: events, error } = await supabase
    .from('pipeline_events')
    .select('*')
    .gte('created_at', from)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return { counts, pipeline: null, pipelineError: error.message };
  }

  const rows = (events ?? []) as Array<{
    event_type: PipelineEventType;
    difficulty: string;
    is_daily: boolean;
    duration_ms: number | null;
    validation_score: number | null;
    candidates_tried: number;
    failure_reason: string | null;
    created_at: string;
  }>;

  const total = rows.length;
  const successes = rows.filter((r) => r.event_type === 'success').length;

  const byType = rows.reduce((acc, r) => {
    acc[r.event_type] = (acc[r.event_type] ?? 0) + 1;
    return acc;
  }, {} as Record<PipelineEventType, number>);

  const byDiff = rows.reduce(
    (acc, r) => {
      if (!acc[r.difficulty]) acc[r.difficulty] = { runs: 0, successes: 0, successPct: 0 };
      acc[r.difficulty].runs++;
      if (r.event_type === 'success') acc[r.difficulty].successes++;
      return acc;
    },
    {} as Record<string, { runs: number; successes: number; successPct: number }>,
  );
  Object.values(byDiff).forEach((d) => {
    d.successPct = d.runs > 0 ? Math.round((d.successes / d.runs) * 100) : 0;
  });

  const successRows = rows.filter((r) => r.event_type === 'success');
  const avgMs =
    successRows.length > 0
      ? Math.round(successRows.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / successRows.length)
      : null;
  const avgScore =
    successRows.length > 0
      ? Number((successRows.reduce((s, r) => s + (r.validation_score ?? 0), 0) / successRows.length).toFixed(2))
      : null;
  const avgCandidates =
    total > 0 ? Number((rows.reduce((s, r) => s + r.candidates_tried, 0) / total).toFixed(1)) : null;

  const pipeline: PipelineStats = {
    period: { from, to, days },
    totals: { runs: total, successes, failures: total - successes },
    rates: {
      successPct: total > 0 ? Math.round((successes / total) * 100) : 0,
      duplicateRatePct: total > 0 ? Math.round(((byType.duplicate_rejected ?? 0) / total) * 100) : 0,
      validationFailPct: total > 0 ? Math.round(((byType.validation_failed ?? 0) / total) * 100) : 0,
      rateLimitedPct: total > 0 ? Math.round(((byType.rate_limited ?? 0) / total) * 100) : 0,
    },
    performance: { avgSuccessMs: avgMs, avgValidationScore: avgScore, avgCandidatesTried: avgCandidates },
    breakdown: byType,
    byDifficulty: byDiff,
    recentEvents: rows.slice(0, 20).map((r) => ({
      eventType: r.event_type,
      difficulty: r.difficulty,
      isDaily: r.is_daily,
      durationMs: r.duration_ms,
      validationScore: r.validation_score,
      failureReason: r.failure_reason,
      createdAt: r.created_at,
    })),
  };

  return { counts, pipeline, pipelineError: null };
}
