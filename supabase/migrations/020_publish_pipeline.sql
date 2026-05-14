-- ================================================================
-- AdvaitAI Daily Maths Riddle — Publish Pipeline
-- Migration: 020_publish_pipeline
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. daily_riddle_queue ────────────────────────────────────────
-- Pre-generated riddles waiting for publish. Each row is a candidate
-- for a specific date+difficulty slot. The publish cron promotes
-- the highest-priority pending entry to the live riddles table.

create table if not exists public.daily_riddle_queue (
  id              uuid        primary key default gen_random_uuid(),
  target_date     date        not null,
  difficulty      text        not null check (difficulty in ('easy', 'medium', 'hard')),
  riddle_id       uuid        not null references public.riddles(id) on delete cascade,
  position        integer     not null default 0,
  status          text        not null default 'pending'
                              check (status in ('pending', 'published', 'rejected', 'expired')),
  rejected_reason text,
  generated_at    timestamptz not null default now(),
  published_at    timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.daily_riddle_queue is
  'Pre-generated riddle candidates queued for scheduled publish.';
comment on column public.daily_riddle_queue.position is
  'Lower = higher priority. The publish cron picks position 0 first.';

create index if not exists queue_date_status
  on public.daily_riddle_queue (target_date, status, position);

create index if not exists queue_riddle_idx
  on public.daily_riddle_queue (riddle_id);

alter table public.daily_riddle_queue enable row level security;
-- Service-role only — no user-facing policies.

-- ── 2. generation_jobs ──────────────────────────────────────────
-- Tracks every generation job: queued, running, completed, or failed.
-- Used by the admin panel to inspect generation health.

create table if not exists public.generation_jobs (
  id              uuid        primary key default gen_random_uuid(),
  target_date     date        not null,
  difficulty      text        not null check (difficulty in ('easy', 'medium', 'hard')),
  status          text        not null default 'queued'
                              check (status in ('queued', 'running', 'completed', 'failed')),
  riddle_id       uuid        references public.riddles(id) on delete set null,
  queue_entry_id  uuid        references public.daily_riddle_queue(id) on delete set null,
  error_message   text,
  retry_count     integer     not null default 0,
  duration_ms     integer,
  created_by      uuid        references auth.users(id) on delete set null,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.generation_jobs is
  'Tracks every riddle generation job with status, timing, and retry info.';

create index if not exists jobs_date_status
  on public.generation_jobs (target_date, status);

create index if not exists jobs_created_at
  on public.generation_jobs (created_at desc);

alter table public.generation_jobs enable row level security;
-- Service-role only.

-- ── 3. admin_audit_logs ──────────────────────────────────────────
-- Immutable audit trail of every admin action.

create table if not exists public.admin_audit_logs (
  id              uuid        primary key default gen_random_uuid(),
  actor_id        uuid        not null references auth.users(id) on delete set null,
  action          text        not null check (action in (
                    'publish', 'replace', 'rollback', 'regenerate',
                    'approve', 'reject', 'config_change', 'manual_publish'
                  )),
  target_type     text        not null check (target_type in (
                    'riddle', 'queue_entry', 'generation_job', 'config', 'scheduled_riddle'
                  )),
  target_id       text,
  metadata        jsonb       default '{}',
  created_at      timestamptz not null default now()
);

comment on table public.admin_audit_logs is
  'Immutable log of every admin action. Never deleted.';

create index if not exists audit_created_at
  on public.admin_audit_logs (created_at desc);

create index if not exists audit_actor
  on public.admin_audit_logs (actor_id, created_at desc);

create index if not exists audit_action
  on public.admin_audit_logs (action, created_at desc);

alter table public.admin_audit_logs enable row level security;

-- Admins can read audit logs
drop policy if exists "audit_logs: admin read" on public.admin_audit_logs;
create policy "audit_logs: admin read"
  on public.admin_audit_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Service-role handles inserts (no user-facing insert policy)

-- ── Verification ─────────────────────────────────────────────────
-- After running, confirm with:
--   select table_name from information_schema.tables
--   where table_schema = 'public'
--   and table_name in ('daily_riddle_queue', 'generation_jobs', 'admin_audit_logs');
