/**
 * lib/analytics/pipelineEvents.ts
 *
 * Writes pipeline_event rows after every pipeline run.
 * Non-throwing — analytics failures must never break generation.
 */

import type { PipelineEventType } from '@/types/analytics';

export interface LogPipelineEventOpts {
  sessionId: string | null;
  userId: string | null;
  difficulty: string;
  isDaily: boolean;
  eventType: PipelineEventType;
  riddleId?: string;
  validationScore?: number;
  durationMs?: number;
  attemptsMade?: number;
  candidatesTried?: number;
  failureReason?: string;
  generationMode?: 'freeform' | 'templated' | 'deterministic_fallback';
  templateFamily?: string | null;
}

export async function logPipelineEvent(opts: LogPipelineEventOpts): Promise<void> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createServiceClient()) as any;

    await supabase.from('pipeline_events').insert({
      session_id: opts.sessionId,
      user_id: opts.userId,
      difficulty: opts.difficulty,
      is_daily: opts.isDaily,
      event_type: opts.eventType,
      riddle_id: opts.riddleId ?? null,
      validation_score: opts.validationScore ?? null,
      duration_ms: opts.durationMs ?? null,
      attempts_made: opts.attemptsMade ?? 1,
      candidates_tried: opts.candidatesTried ?? 0,
      failure_reason: opts.failureReason ?? null,
      generation_mode: opts.generationMode ?? 'freeform',
      template_family: opts.templateFamily ?? null,
    });
  } catch (err) {
    // Non-throwing — analytics must never crash generation
    console.error('[analytics] logPipelineEvent failed (non-critical):', err);
  }
}
