-- ================================================================
-- AdvaitAI Daily Maths Riddle — Auth Foundation Migration
-- Migration: 001_auth_foundation  (IDEMPOTENT — safe to re-run)
-- Run this SQL in: Supabase Dashboard → SQL Editor
--
-- All CREATE POLICY statements are wrapped in DO $$ blocks so
-- re-running this on an existing database does NOT error out.
-- ================================================================

-- ── 1. Profiles Table ────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null,
  full_name   text,
  avatar_url  text,
  role        text        not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'App-level user profiles extending auth.users.';
comment on column public.profiles.role is 'user | admin — controls access to admin features.';

-- ── 2. Row Level Security ────────────────────────────────────────

alter table public.profiles enable row level security;

-- Idempotent policy creation: DO block checks existence before creating
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles: users can view own'
  ) then
    create policy "profiles: users can view own"
      on public.profiles
      for select
      using (auth.uid() = id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles: users can update own'
  ) then
    create policy "profiles: users can update own"
      on public.profiles
      for update
      using (auth.uid() = id)
      with check (
        auth.uid() = id
        and role = (select role from public.profiles where id = auth.uid())
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles: admins can view all'
  ) then
    create policy "profiles: admins can view all"
      on public.profiles
      for select
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end;
$$;

-- ── 3. updated_at Trigger ────────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row
  execute procedure public.handle_updated_at();

-- ── 4. Auto-Create Profile on Sign-Up ───────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ── 5. Helper: is_admin() ────────────────────────────────────────

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

-- ── Verification ─────────────────────────────────────────────────
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public' and tablename = 'profiles';
