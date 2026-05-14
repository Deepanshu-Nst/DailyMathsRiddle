-- ================================================================
-- AdvaitAI Daily Maths Riddle — Profile Synchronization
-- Migration: 010_profile_sync
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. Robust handle_new_user Function ──────────────────────────
-- This function ensures a profile row exists for every auth user.
-- It uses an upsert (ON CONFLICT DO NOTHING/UPDATE) to be safe.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, 
    email, 
    full_name, 
    avatar_url,
    streak_count,
    xp
  )
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    0,
    0
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
    
  return new;
end;
$$;

-- ── 2. Re-create Trigger ─────────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ── 3. Manual Sync (Backfill) ────────────────────────────────────
-- Insert profiles for any existing users who might have slipped through.
insert into public.profiles (id, email, full_name, avatar_url, streak_count, xp)
select 
  id, 
  coalesce(email, ''), 
  raw_user_meta_data ->> 'full_name', 
  raw_user_meta_data ->> 'avatar_url',
  0,
  0
from auth.users
on conflict (id) do nothing;
