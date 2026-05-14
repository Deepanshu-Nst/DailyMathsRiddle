-- ================================================================
-- AdvaitAI Daily Maths Riddle — Fix Pipeline Stats View
-- Migration: 017_fix_pipeline_stats_view
-- ================================================================

drop view if exists public.v_pipeline_stats;

create view public.v_pipeline_stats as
select
  -- Timeframe buckets (Daily only for dashboard stability)
  date_trunc('day', created_at)   as day,
  -- Volume
  count(*)                                                      as total_runs,
  count(*) filter (where event_type = 'success')                as successes,
  count(*) filter (where event_type != 'success')               as failures,
  count(*) filter (where event_type = 'rate_limited')           as rate_limited,
  count(*) filter (where event_type = 'duplicate_rejected')     as duplicate_rejected,
  count(*) filter (where event_type = 'validation_failed')      as validation_failed,
  count(*) filter (where event_type = 'generator_error')        as generator_errors,
  -- Rates
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
group by 1
order by 1 desc;

comment on view public.v_pipeline_stats is 'Aggregated daily pipeline metrics.';
