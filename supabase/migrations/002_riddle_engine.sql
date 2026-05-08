-- ================================================================
-- AdvaitAI Daily Maths Riddle — Phase 2: Riddle Engine Schema
-- Migration: 002_riddle_engine
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. Riddles Table ─────────────────────────────────────────────
-- The canonical source of truth for all riddles.
-- Every riddle served to users must exist in this table first.

create table if not exists public.riddles (
  id               uuid        primary key default gen_random_uuid(),
  slug             text        not null unique,
  question         text        not null,
  answer           text        not null,
  answer_variants  text[]      not null default '{}',
  hint1            text        not null default '',
  hint2            text        not null default '',
  explanation      text        not null,
  difficulty       text        not null check (difficulty in ('easy', 'medium', 'hard')),
  category         text        not null default '',
  source_type      text        not null default 'ai' check (source_type in ('ai', 'admin')),
  is_daily         boolean     not null default false,
  daily_date       date,
  status           text        not null default 'published' check (status in ('draft', 'published')),
  created_by       uuid        references auth.users(id) on delete set null,
  validation_score float,
  generator_model  text,
  created_at       timestamptz not null default now()
);

comment on table public.riddles is 'Canonical riddle store — all riddles served must persist here first.';
comment on column public.riddles.slug is 'Immutable URL-safe identifier. Used in /r/[slug] share routes.';
comment on column public.riddles.is_daily is 'True if this is the scheduled daily riddle for daily_date.';
comment on column public.riddles.answer_variants is 'Alternative accepted answers (e.g. "15 min" for answer "15").';

-- Unique constraint: only one daily riddle per date+difficulty
create unique index if not exists riddles_daily_unique
  on public.riddles (daily_date, difficulty)
  where is_daily = true;

-- ── 2. Riddles Indexes ────────────────────────────────────────────

create index if not exists riddles_daily_lookup
  on public.riddles (daily_date, difficulty)
  where is_daily = true and status = 'published';

create index if not exists riddles_slug_idx
  on public.riddles (slug);

create index if not exists riddles_status_created
  on public.riddles (status, created_at desc);

create index if not exists riddles_difficulty_created
  on public.riddles (difficulty, created_at desc)
  where status = 'published';

-- ── 3. Riddles RLS ───────────────────────────────────────────────

alter table public.riddles enable row level security;

-- Anyone can read published riddles
create policy "riddles: public can read published"
  on public.riddles
  for select
  using (status = 'published');

-- Only service role (backend) can insert/update/delete
-- No user-facing insert policy — all writes go through service client

-- ── 4. user_attempts Table ───────────────────────────────────────
-- Records every answer submission — used for leaderboard + analytics.

create table if not exists public.user_attempts (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        references auth.users(id) on delete cascade,
  riddle_id        uuid        not null references public.riddles(id) on delete cascade,
  submitted_answer text        not null,
  is_correct       boolean     not null,
  attempted_at     timestamptz not null default now()
);

comment on table public.user_attempts is 'Records every answer submission per user per riddle.';

-- ── 5. user_attempts Indexes ─────────────────────────────────────

create index if not exists attempts_user_created
  on public.user_attempts (user_id, attempted_at desc);

create index if not exists attempts_riddle_idx
  on public.user_attempts (riddle_id);

create index if not exists attempts_user_riddle
  on public.user_attempts (user_id, riddle_id);

-- ── 6. user_attempts RLS ─────────────────────────────────────────

alter table public.user_attempts enable row level security;

-- Users can see their own attempts
create policy "attempts: users can view own"
  on public.user_attempts
  for select
  using (auth.uid() = user_id);

-- Users can insert their own attempts
create policy "attempts: users can insert own"
  on public.user_attempts
  for insert
  with check (auth.uid() = user_id);

-- Anon users can insert without user_id (session-based tracking)
create policy "attempts: anon can insert"
  on public.user_attempts
  for insert
  with check (user_id is null);

-- ── 7. generation_logs Table ─────────────────────────────────────
-- Tracks extra riddle generation requests for rate limiting.

create table if not exists public.generation_logs (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        references auth.users(id) on delete set null,
  session_id          text,                              -- for anonymous users
  generated_riddle_id uuid        references public.riddles(id) on delete set null,
  difficulty          text        not null,
  created_at          timestamptz not null default now()
);

comment on table public.generation_logs is 'Audit log for extra riddle generation — used for rate limiting.';

-- ── 8. generation_logs Indexes ───────────────────────────────────

create index if not exists genlogs_session_created
  on public.generation_logs (session_id, created_at desc);

create index if not exists genlogs_user_created
  on public.generation_logs (user_id, created_at desc);

-- ── 9. generation_logs RLS ───────────────────────────────────────

alter table public.generation_logs enable row level security;

-- Users can read their own logs
create policy "genlogs: users can read own"
  on public.generation_logs
  for select
  using (auth.uid() = user_id);

-- Service role handles all inserts (no user-facing insert policy)

-- ── Verification ─────────────────────────────────────────────────
-- After running, confirm with:
--
-- select table_name from information_schema.tables
-- where table_schema = 'public'
-- order by table_name;
--
-- Expected: generation_logs, profiles, riddles, user_attempts
