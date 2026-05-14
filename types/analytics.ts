export type PipelineEventType =
  | 'success'
  | 'validation_failed'
  | 'duplicate_rejected'
  | 'structural_rejected'
  | 'generator_error'
  | 'rate_limited'
  | 'db_insert_failed';

export interface PipelineEvent {
  id: string;
  session_id: string | null;
  user_id: string | null;
  difficulty: string;
  is_daily: boolean;
  event_type: PipelineEventType;
  riddle_id: string | null;
  validation_score: number | null;
  duration_ms: number | null;
  attempts_made: number;
  candidates_tried: number;
  failure_reason: string | null;
  created_at: string;
}

/** Shape returned by GET /api/admin/stats */
export interface PipelineStats {
  period: {
    from: string;
    to: string;
    days: number;
  };
  totals: {
    runs: number;
    successes: number;
    failures: number;
  };
  rates: {
    successPct: number;
    duplicateRatePct: number;
    validationFailPct: number;
    rateLimitedPct: number;
  };
  performance: {
    avgSuccessMs: number | null;
    avgValidationScore: number | null;
    avgCandidatesTried: number | null;
  };
  breakdown: Record<PipelineEventType, number>;
  byDifficulty: Record<string, { runs: number; successes: number; successPct: number }>;
  recentEvents: Array<{
    eventType: PipelineEventType;
    difficulty: string;
    isDaily: boolean;
    durationMs: number | null;
    validationScore: number | null;
    failureReason: string | null;
    createdAt: string;
  }>;
}
