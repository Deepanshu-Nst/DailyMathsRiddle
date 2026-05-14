-- ================================================================
-- AdvaitAI Daily Maths Riddle — Admin Role Authorization
-- Migration: 012_admin_roles
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. Update Profiles Table ─────────────────────────────────────
-- We ensure the role column exists and has the correct default.
-- We use a check constraint for the allowed roles.

alter table public.profiles 
add column if not exists role text not null default 'user' 
check (role in ('user', 'moderator', 'admin'));

-- Index for fast role-based lookups
create index if not exists profiles_role_idx on public.profiles (role);

-- ── 2. Administrative RLS Policies ────────────────────────────────

-- Riddles: Only admins can manage published/scheduled riddles
-- Note: We already have a select policy for everyone.
drop policy if exists "riddles: admin manage" on public.riddles;
create policy "riddles: admin manage"
  on public.riddles
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Challenges: Only moderators and admins can review
drop policy if exists "challenges: admin manage" on public.riddles; -- assuming challenges might be in a separate table later, but for now applying to riddles where status='draft'
-- (Applying generally to table for now)

-- ── 3. Helper: is_admin() / is_moderator() ───────────────────────
-- Redefine helpers to be non-recursive if possible (using auth.jwt() metadata if synced, 
-- but here we rely on the profiles table for authority).
-- To avoid recursion, we ensure these are only used in policies of OTHER tables, not profiles itself.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;
