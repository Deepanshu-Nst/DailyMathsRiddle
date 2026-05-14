-- ================================================================
-- AdvaitAI Daily Maths Riddle — Phase 2.5: Observability Layer
-- Migration: 003_pipeline_events
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. pipeline_events Table ─────────────────────────────────────
-- Records EVERY pipeline outcome — successes AND failures.
-- generation_logs only tracks successful inserts (used for rate limiting).
-- pipeline_events is the full observability record.

create table if not exists public.pipeline_events (
  id              uuid        primary key default gen_random_uuid(),
  -- Who triggered the generation
  session_id      text,
  user_id         uuid        references auth.users(id) on delete set null,
  -- What was generated
  difficulty      text        not null check (difficulty in ('easy', 'medium', 'hard')),
  is_daily        boolean     not null default false,
  -- Pipeline outcome
  event_type      text        not null check (event_type in (
                    'success',              -- Riddle saved to DB, returned to user
                    'validation_failed',    -- AI validator rejected all candidates
                    'duplicate_rejected',   -- All candidates failed dedup
                    'structural_rejected',  -- All candidates failed structural checks
                    'generator_error',      -- Groq API error (non-429)
                    'rate_limited',         -- Groq 429 — exhausted retries
                    'db_insert_failed'      -- Riddle passed all checks but DB save failed
                  )),
  -- Metrics
  riddle_id       uuid        references public.riddles(id) on delete set null,
  validation_score float,                   -- final composite score if success
  duration_ms     integer,                  -- total pipeline wall time
  attempts_made   integer     not null default 1,  -- how many batch retries
  candidates_tried integer    not null default 0,  -- how many individual candidates evaluated
  -- Error details (for failures)
  failure_reason  text,                     -- human-readable failure reason
  -- Metadata
  created_at      timestamptz not null default now()
);

comment on table public.pipeline_events is
  'Full observability log for the generation pipeline. Every call — success or failure — is recorded here.';
comment on column public.pipeline_events.event_type is
  'Outcome of the generation pipeline run.';
comment on column public.pipeline_events.duration_ms is
  'Total wall-clock time from pipeline start to return, in milliseconds.';
comment on column public.pipeline_events.candidates_tried is
  'Number of individual riddle candidates evaluated before stopping.';

-- ── 2. Indexes ────────────────────────────────────────────────────

create index if not exists pipeline_events_created_at
  on public.pipeline_events (created_at desc);

create index if not exists pipeline_events_event_type
  on public.pipeline_events (event_type, created_at desc);

create index if not exists pipeline_events_difficulty
  on public.pipeline_events (difficulty, created_at desc);

create index if not exists pipeline_events_session
  on public.pipeline_events (session_id, created_at desc);

-- ── 3. RLS ────────────────────────────────────────────────────────

alter table public.pipeline_events enable row level security;

-- Only service role (backend) can insert/read pipeline events.
-- Users cannot read this table — it contains internal metrics.
-- Admins access via service client from admin routes.

-- ── 4. Analytics View ────────────────────────────────────────────
-- Pre-computed aggregates — query this from the admin stats API.

drop view if exists public.v_pipeline_stats;

create view public.v_pipeline_stats as
select
  -- Timeframe buckets
  date_trunc('day', created_at)   as day,
  date_trunc('hour', created_at)  as hour,
  -- Volume
  count(*)                                                      as total_runs,
  count(*) filter (where event_type = 'success')                as successes,
  count(*) filter (where event_type != 'success')               as failures,
  count(*) filter (where event_type = 'rate_limited')           as rate_limited,
  count(*) filter (where event_type = 'duplicate_rejected')     as duplicate_rejected,
  count(*) filter (where event_type = 'validation_failed')      as validation_failed,
  count(*) filter (where event_type = 'generator_error')        as generator_errors,
  -- Rates (cast to numeric — round(float8, int) doesn't exist in Postgres)
  round(
    count(*) filter (where event_type = 'success')::numeric /
    nullif(count(*), 0) * 100, 1
  ) as success_rate_pct,
  round(
    count(*) filter (where event_type = 'duplicate_rejected')::numeric /
    nullif(count(*), 0) * 100, 1
  ) as duplicate_rate_pct,
  -- Performance (::numeric cast required before round with precision arg)
  round(avg(duration_ms) filter (where event_type = 'success')::numeric)  as avg_success_ms,
  round(avg(duration_ms)::numeric)                                          as avg_duration_ms,
  round((avg(validation_score) filter (where validation_score is not null))::numeric, 2) as avg_validation_score,
  round(avg(candidates_tried)::numeric, 1)                                  as avg_candidates_tried
from public.pipeline_events
group by 1, 2
order by 1 desc, 2 desc;

comment on view public.v_pipeline_stats is
  'Pre-aggregated pipeline metrics grouped by day and hour.';

-- ── 5. Verification ───────────────────────────────────────────────
-- After running, confirm with:
--   select * from public.pipeline_events limit 5;
--   select * from public.v_pipeline_stats limit 24;
