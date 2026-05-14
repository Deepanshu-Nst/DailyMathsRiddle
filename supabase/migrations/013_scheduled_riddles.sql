-- ================================================================
-- AdvaitAI Daily Maths Riddle — Scheduled Riddles System
-- Migration: 013_scheduled_riddles
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. Scheduled Riddles Table ───────────────────────────────────

create table if not exists public.scheduled_riddles (
  id               uuid primary key default gen_random_uuid(),
  publish_date     date not null,
  difficulty       text not null check (difficulty in ('easy', 'medium', 'hard')),
  question         text not null,
  answer           text not null,
  explanation      text not null,
  source           text default 'admin',
  status           text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  created_by       uuid references auth.users(id),
  approved_by      uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  
  -- Enforce unique riddle per date + difficulty
  unique (publish_date, difficulty)
);

-- Indexes for performance
create index if not exists scheduled_riddles_date_idx on public.scheduled_riddles (publish_date);
create index if not exists scheduled_riddles_status_idx on public.scheduled_riddles (status);

-- ── 2. RLS Policies ──────────────────────────────────────────────

alter table public.scheduled_riddles enable row level security;

-- Admins can do everything
create policy "scheduled_riddles: admin full access"
  on public.scheduled_riddles
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Public read for published riddles only (if needed for frontend, 
-- but usually the API will serve it)
create policy "scheduled_riddles: public read published"
  on public.scheduled_riddles
  for select
  using (status = 'published');

-- ── 3. Triggers for updated_at ───────────────────────────────────
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.scheduled_riddles
  for each row
  execute procedure public.update_updated_at_column();
