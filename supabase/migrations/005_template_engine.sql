-- ================================================================
-- AdvaitAI Daily Maths Riddle — Phase 2.7: Template Engine Pivot
-- Migration: 005_template_engine
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- Add generation_mode to riddles
alter table public.riddles 
add column if not exists generation_mode text default 'freeform' check (generation_mode in ('freeform', 'templated', 'deterministic_fallback'));

-- Add generation_mode to pipeline_events
alter table public.pipeline_events 
add column if not exists generation_mode text default 'freeform' check (generation_mode in ('freeform', 'templated', 'deterministic_fallback'));

-- Re-create v_pipeline_stats view to include generation_mode
drop view if exists public.v_pipeline_stats;

create view public.v_pipeline_stats as
select
  -- Timeframe buckets
  date_trunc('day', created_at)   as day,
  date_trunc('hour', created_at)  as hour,
  generation_mode,
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
  -- Performance
  round(avg(duration_ms) filter (where event_type = 'success')::numeric)  as avg_success_ms,
  round(avg(duration_ms)::numeric)                                          as avg_duration_ms,
  round((avg(validation_score) filter (where validation_score is not null))::numeric, 2) as avg_validation_score,
  round(avg(candidates_tried)::numeric, 1)                                  as avg_candidates_tried
from public.pipeline_events
group by 1, 2, 3
order by 1 desc, 2 desc;

comment on view public.v_pipeline_stats is
  'Pre-aggregated pipeline metrics grouped by day, hour, and generation_mode.';
