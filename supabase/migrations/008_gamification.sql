-- ================================================================
-- AdvaitAI Daily Maths Riddle — Phase 3.2: Gamification Engine
-- Migration: 008_gamification
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. user_stats ─────────────────────────────────────────────────
-- One row per authenticated user. Upserted on every correct solve.

create table if not exists public.user_stats (
  user_id          uuid        primary key references auth.users(id) on delete cascade,
  total_xp         integer     not null default 0,
  current_streak   integer     not null default 0,
  best_streak      integer     not null default 0,
  riddles_solved   integer     not null default 0,
  easy_solved      integer     not null default 0,
  medium_solved    integer     not null default 0,
  hard_solved      integer     not null default 0,
  total_attempts   integer     not null default 0,
  correct_attempts integer     not null default 0,
  last_solved_date date,
  updated_at       timestamptz not null default now()
);

comment on table public.user_stats is 'Aggregated progression stats per user. Upserted on every solve.';

alter table public.user_stats enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_stats' and policyname='user_stats: users can read own') then
    create policy "user_stats: users can read own"
      on public.user_stats for select using (auth.uid() = user_id);
  end if;
end; $$;

-- ── 2. streak_events ──────────────────────────────────────────────
-- Immutable audit log of every streak state change.

create table if not exists public.streak_events (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  event_type   text        not null check (event_type in ('increment', 'reset', 'restore')),
  streak_value integer     not null,
  solved_date  date        not null,
  created_at   timestamptz not null default now()
);

comment on table public.streak_events is 'Immutable log of streak state changes.';

create index if not exists streak_events_user_date on public.streak_events (user_id, created_at desc);

alter table public.streak_events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='streak_events' and policyname='streak_events: users can read own') then
    create policy "streak_events: users can read own"
      on public.streak_events for select using (auth.uid() = user_id);
  end if;
end; $$;

-- ── 3. xp_events ──────────────────────────────────────────────────
-- Immutable XP audit log.

create table if not exists public.xp_events (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  amount     integer     not null,
  reason     text        not null,
  riddle_id  uuid        references public.riddles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.xp_events is 'Immutable XP audit log. Every XP award is recorded here.';

create index if not exists xp_events_user_date on public.xp_events (user_id, created_at desc);

alter table public.xp_events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='xp_events' and policyname='xp_events: users can read own') then
    create policy "xp_events: users can read own"
      on public.xp_events for select using (auth.uid() = user_id);
  end if;
end; $$;

-- ── 4. updated_at trigger for user_stats ─────────────────────────

create or replace function public.handle_user_stats_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists on_user_stats_updated on public.user_stats;
create trigger on_user_stats_updated
  before update on public.user_stats
  for each row execute procedure public.handle_user_stats_updated_at();

-- ── Verification ─────────────────────────────────────────────────
-- select table_name from information_schema.tables
-- where table_schema = 'public' and table_name in ('user_stats','streak_events','xp_events');
