-- ================================================================
-- AdvaitAI Daily Maths Riddle — Daily Riddle Slots
-- Migration: 021_daily_riddle_slots
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. daily_riddle_slots ────────────────────────────────────────
-- Authoritative mapping: one row = one active riddle slot.
-- One day. One difficulty. One active riddle.
--
-- The website resolves daily riddles from THIS table ONLY.
-- Riddle records themselves are never mutated (immutable history).
-- This table is the "air-traffic control board" for daily content.

create table if not exists public.daily_riddle_slots (
  official_date   date        not null,
  difficulty      text        not null check (difficulty in ('easy', 'medium', 'hard')),
  riddle_id       uuid        not null references public.riddles(id) on delete restrict,
  source_type     text        not null default 'ai'
                              check (source_type in ('ai', 'manual', 'scheduled', 'emergency')),
  is_manual       boolean     not null default false,
  published_by    uuid        references auth.users(id) on delete set null,
  published_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),

  -- One riddle per day per difficulty — the core invariant
  primary key (official_date, difficulty)
);

comment on table public.daily_riddle_slots is
  'Authoritative daily riddle mapping. One row = one active slot. Website resolves from here ONLY.';
comment on column public.daily_riddle_slots.source_type is
  'How this slot was filled: ai, manual (admin override), scheduled (pre-scheduled), emergency (fallback).';
comment on column public.daily_riddle_slots.is_manual is
  'True if an admin explicitly set this slot. Manual slots take priority over AI.';

create index if not exists slots_date_idx
  on public.daily_riddle_slots (official_date);

create index if not exists slots_riddle_idx
  on public.daily_riddle_slots (riddle_id);

alter table public.daily_riddle_slots enable row level security;

-- Public read for daily resolution
create policy "daily_slots: public read"
  on public.daily_riddle_slots
  for select
  using (true);

-- Service-role handles writes (no user-facing insert/update policies)

-- ── 2. Backfill existing daily riddles into slots ────────────────
-- This populates slots from any existing riddles marked as daily.
-- Safe to re-run — uses ON CONFLICT DO NOTHING.

insert into public.daily_riddle_slots (official_date, difficulty, riddle_id, source_type, is_manual, published_at)
select
  r.daily_date,
  r.difficulty,
  r.id,
  case when r.source_type = 'admin' then 'manual' else 'ai' end,
  r.source_type = 'admin',
  r.created_at
from public.riddles r
where r.is_daily = true
  and r.daily_date is not null
  and r.status = 'published'
on conflict (official_date, difficulty) do nothing;

-- ── 3. Update admin_audit_logs action constraint ─────────────────
-- Add 'slot_publish' and 'slot_override' actions

alter table public.admin_audit_logs
  drop constraint if exists admin_audit_logs_action_check;

alter table public.admin_audit_logs
  add constraint admin_audit_logs_action_check
  check (action in (
    'publish', 'replace', 'rollback', 'regenerate',
    'approve', 'reject', 'config_change', 'manual_publish',
    'slot_publish', 'slot_override', 'slot_schedule'
  ));

-- ── Verification ─────────────────────────────────────────────────
-- After running, confirm with:
--   select * from public.daily_riddle_slots order by official_date desc limit 10;
