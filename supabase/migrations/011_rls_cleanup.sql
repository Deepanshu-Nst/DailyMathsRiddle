-- ================================================================
-- AdvaitAI Daily Maths Riddle — RLS Policy Cleanup
-- Migration: 011_rls_cleanup
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. Clean Up Profiles Policies ───────────────────────────────
-- Remove recursive policies that query profiles within profiles.

drop policy if exists "profiles: users can view own" on public.profiles;
drop policy if exists "profiles: users can update own" on public.profiles;
drop policy if exists "profiles: admins can view all" on public.profiles;
drop policy if exists "profiles: anyone can view" on public.profiles;

-- Atomic, non-recursive policies
create policy "profiles: public read"
  on public.profiles for select
  using (true);

create policy "profiles: user update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles: user insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ── 2. Clean Up User Stats Policies ─────────────────────────────
drop policy if exists "user_stats: users can view own" on public.user_stats;
drop policy if exists "user_stats: anyone can view" on public.user_stats;

create policy "user_stats: public read"
  on public.user_stats for select
  using (true);

-- User stats updates are usually done via service_role, but if allowed for users:
-- create policy "user_stats: user update own" on public.user_stats for update using (auth.uid() = user_id);

-- ── 3. Clean Up Achievement Policies ────────────────────────────
drop policy if exists "achievements: anyone can view" on public.achievements;
create policy "achievements: public read"
  on public.achievements for select
  using (true);

drop policy if exists "user_achievements: anyone can view" on public.user_achievements;
create policy "user_achievements: public read"
  on public.user_achievements for select
  using (true);

-- ── 4. Verify RLS is enabled ────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.user_stats enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
