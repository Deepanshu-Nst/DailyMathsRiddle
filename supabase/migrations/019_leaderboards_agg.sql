-- ================================================================
-- AdvaitAI Daily Maths Riddle — Phase 4.1: Leaderboards Aggregation
-- Migration: 019_leaderboards_agg
-- ================================================================

-- 1. Global XP Leaderboard View
drop view if exists public.v_leaderboard_global;
create view public.v_leaderboard_global as
select 
  p.id,
  coalesce(p.username, 'Anonymous Seeker') as username,
  p.avatar_url,
  s.total_xp,
  s.current_streak,
  rank() over (order by s.total_xp desc) as rank
from public.profiles p
join public.user_stats s on p.id = s.user_id
order by s.total_xp desc;

-- 2. Current Streak Leaderboard View
drop view if exists public.v_leaderboard_streaks;
create view public.v_leaderboard_streaks as
select 
  p.id,
  coalesce(p.username, 'Anonymous Seeker') as username,
  p.avatar_url,
  s.current_streak,
  s.total_xp,
  rank() over (order by s.current_streak desc, s.total_xp desc) as rank
from public.profiles p
join public.user_stats s on p.id = s.user_id
order by s.current_streak desc, s.total_xp desc;

-- 3. Weekly XP Aggregation View
drop view if exists public.v_leaderboard_weekly;
create view public.v_leaderboard_weekly as
select 
  p.id,
  coalesce(p.username, 'Anonymous Seeker') as username,
  p.avatar_url,
  sum(e.amount) as weekly_xp,
  rank() over (order by sum(e.amount) desc) as rank
from public.profiles p
join public.xp_events e on p.id = e.user_id
where e.created_at >= date_trunc('week', now())
group by p.id, p.username, p.avatar_url
order by weekly_xp desc;

-- 4. Monthly XP Aggregation View
drop view if exists public.v_leaderboard_monthly;
create view public.v_leaderboard_monthly as
select 
  p.id,
  coalesce(p.username, 'Anonymous Seeker') as username,
  p.avatar_url,
  sum(e.amount) as monthly_xp,
  rank() over (order by sum(e.amount) desc) as rank
from public.profiles p
join public.xp_events e on p.id = e.user_id
where e.created_at >= date_trunc('month', now())
group by p.id, p.username, p.avatar_url
order by monthly_xp desc;

-- 5. Anti-abuse Indices
create index if not exists xp_events_created_at_idx on public.xp_events (created_at);

comment on view public.v_leaderboard_global is 'Global XP leaderboard (all-time).';
comment on view public.v_leaderboard_weekly is 'XP earned during the current calendar week.';
comment on view public.v_leaderboard_monthly is 'XP earned during the current calendar month.';
comment on view public.v_leaderboard_streaks is 'Current active streaks leaderboard.';
