-- ================================================================
-- AdvaitAI Daily Maths Riddle — Phase 3.3: Identity & Social
-- Migration: 009_identity_and_social
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. Username System in Profiles ──────────────────────────────
alter table public.profiles
add column if not exists username text unique,
add column if not exists username_updated_at timestamptz;

comment on column public.profiles.username is 'Unique, slug-safe username for public profiles.';
comment on column public.profiles.username_updated_at is 'Timestamp of last username update, used for rate-limiting (e.g., once per 30 days).';

-- Create an index to quickly lookup users by username (for /u/[username] route)
create index if not exists profiles_username_idx on public.profiles (username);

-- Make profiles publicly readable to support public profile pages
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles: anyone can view') then
    create policy "profiles: anyone can view"
      on public.profiles for select using (true);
  end if;
end; $$;

-- ── 2. Make user_stats publicly readable for leaderboards ─────────
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_stats' and policyname='user_stats: anyone can view') then
    create policy "user_stats: anyone can view"
      on public.user_stats for select using (true);
  end if;
end; $$;

-- Add indexes on user_stats for efficient leaderboard sorting
create index if not exists user_stats_total_xp_idx on public.user_stats (total_xp desc);
create index if not exists user_stats_current_streak_idx on public.user_stats (current_streak desc);
create index if not exists user_stats_riddles_solved_idx on public.user_stats (riddles_solved desc);

-- ── 3. Achievements System ────────────────────────────────────────

-- Core table defining available achievements
create table if not exists public.achievements (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text not null,
  icon             text not null,
  requirement_type text not null, -- e.g., 'streak', 'xp', 'hard_solve', 'first_solve', 'accuracy'
  threshold        integer not null,
  created_at       timestamptz not null default now()
);

comment on table public.achievements is 'Defines all available achievements in the system.';

alter table public.achievements enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='achievements' and policyname='achievements: anyone can view') then
    create policy "achievements: anyone can view"
      on public.achievements for select using (true);
  end if;
end; $$;

-- Junction table for when users unlock achievements
create table if not exists public.user_achievements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

comment on table public.user_achievements is 'Records which users have unlocked which achievements.';

create index if not exists user_achievements_user_id_idx on public.user_achievements(user_id);

alter table public.user_achievements enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_achievements' and policyname='user_achievements: anyone can view') then
    create policy "user_achievements: anyone can view"
      on public.user_achievements for select using (true);
  end if;
end; $$;

-- ── 4. Seed Initial Achievements ──────────────────────────────────
-- We use an ON CONFLICT clause to ensure idempotency when seeding data.
-- But since UUIDs might change if we let Postgres generate them, we can just check if empty or insert if not exists by name.
-- Alternatively, we can use a known set of IDs or just insert if the table is empty.

do $$ 
begin
  if not exists (select 1 from public.achievements) then
    insert into public.achievements (name, description, icon, requirement_type, threshold) values
    ('First Solve', 'You solved your very first math riddle. The journey begins.', '🎯', 'first_solve', 1),
    ('7-Day Scholar', 'Maintain a 7-day solve streak.', '🔥', 'streak', 7),
    ('30-Day Master', 'Maintain a 30-day solve streak.', '🏆', 'streak', 30),
    ('Hardcore Thinker', 'Solve 10 riddles on Hard difficulty.', '🧠', 'hard_solve', 10),
    ('Centurion', 'Earn a total of 100 XP.', '💯', 'xp', 100);
  end if;
end $$;
