-- ================================================================
-- AdvaitAI Daily Maths Riddle — Phase 2.8: Template Scaling
-- Migration: 006_template_tracking
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- Add template_family to riddles
alter table public.riddles 
add column if not exists template_family text;

-- Add template_family to pipeline_events
alter table public.pipeline_events 
add column if not exists template_family text;

-- Add template_family to failed_generations
alter table public.failed_generations 
add column if not exists template_family text;

-- Re-create v_pipeline_stats view to include template_family (optional but useful)
drop view if exists public.v_pipeline_stats;

create view public.v_pipeline_stats as
select
  -- Timeframe buckets
  date_trunc('day', created_at)   as day,
  date_trunc('hour', created_at)  as hour,
  generation_mode,
  template_family,
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
group by 1, 2, 3, 4
order by 1 desc, 2 desc;

comment on view public.v_pipeline_stats is
  'Pre-aggregated pipeline metrics grouped by day, hour, generation_mode, and template_family.';
