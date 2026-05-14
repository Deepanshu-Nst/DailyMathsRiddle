-- ================================================================
-- AdvaitAI Daily Maths Riddle — Phase 2.6: Observability
-- Migration: 004_failed_generations
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. failed_generations Table ─────────────────────────────────
-- Records failed AI generations for observability and prompt tuning.

create table if not exists public.failed_generations (
  id               uuid        primary key default gen_random_uuid(),
  session_id       text,                              -- for anonymous users
  user_id          uuid        references auth.users(id) on delete set null,
  difficulty       text        not null check (difficulty in ('easy', 'medium', 'hard')),
  model            text        not null,
  raw_response     text        not null,              -- raw JSON or string from Groq
  rejection_stage  text        not null check (rejection_stage in (
                     'parse_error',
                     'structural_rejected',
                     'validation_failed',
                     'duplicate_rejected'
                   )),
  rejection_reason text        not null,
  created_at       timestamptz not null default now()
);

comment on table public.failed_generations is 'Audit log for failed AI riddle generations.';

-- ── 2. Indexes ───────────────────────────────────────────────────

create index if not exists failed_gen_created_at
  on public.failed_generations (created_at desc);

create index if not exists failed_gen_stage
  on public.failed_generations (rejection_stage, created_at desc);

create index if not exists failed_gen_session
  on public.failed_generations (session_id, created_at desc);

-- ── 3. RLS ───────────────────────────────────────────────────────

alter table public.failed_generations enable row level security;

-- Only service role (backend) can insert/read pipeline events.
-- Users cannot read this table.
