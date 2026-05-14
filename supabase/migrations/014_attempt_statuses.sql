-- ================================================================
-- AdvaitAI Daily Maths Riddle — Attempt Statuses & Give Up Logic
-- Migration: 014_attempt_statuses
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. Update User Attempts Table ───────────────────────────────

-- Add status column
alter table public.user_attempts 
add column if not exists status text not null default 'wrong'
check (status in ('solved', 'wrong', 'gave_up', 'challenged'));

-- Backfill status from is_correct
update public.user_attempts 
set status = 'solved' 
where is_correct = true;

update public.user_attempts 
set status = 'wrong' 
where is_correct = false;

-- Add index for analytics
create index if not exists user_attempts_status_idx on public.user_attempts (status);

-- ── 2. Add Analytics Metrics ─────────────────────────────────────
-- (Optional: View for abandonment tracking)

create or replace view public.attempt_completion_stats as
select
  riddle_id,
  count(*) filter (where status = 'solved') as solved_count,
  count(*) filter (where status = 'gave_up') as gave_up_count,
  count(*) filter (where status = 'wrong') as wrong_count,
  (count(*) filter (where status = 'gave_up')::float / count(*)::float) * 100 as abandonment_rate
from public.user_attempts
group by riddle_id;
