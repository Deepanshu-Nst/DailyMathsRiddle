-- ================================================================
-- AdvaitAI Daily Maths Riddle — AI Observability & Settings
-- Migration: 016_ai_observability
-- ================================================================

-- 1. Create ai_pipeline_logs (Unified table for success & failure)
create table if not exists public.ai_pipeline_logs (
    id               uuid        primary key default gen_random_uuid(),
    session_id       text,
    user_id          uuid        references public.profiles(id) on delete set null,
    difficulty       text        not null check (difficulty in ('easy', 'medium', 'hard')),
    model            text,
    status           text        not null check (status in ('success', 'failure')),
    rejection_stage  text        check (rejection_stage in (
                       'parse_error',
                       'structural_rejected',
                       'validation_failed',
                       'duplicate_rejected',
                       'hallucination_detected'
                     )),
    rejection_reason text,
    duration_ms      integer,
    retry_count      integer     default 0,
    similarity_score float,
    template_family  text,
    created_at       timestamptz not null default now()
);

-- 2. Create ai_settings (Control plane)
create table if not exists public.ai_settings (
    key   text primary key,
    value jsonb not null,
    updated_at timestamptz default now()
);

-- Seed default settings
insert into public.ai_settings (key, value)
values 
  ('generation_config', '{"is_enabled": true, "safe_mode": false, "max_retries": 3, "mode": "standard"}'::jsonb)
on conflict (key) do nothing;

-- 3. RLS
alter table public.ai_pipeline_logs enable row level security;
alter table public.ai_settings enable row level security;

-- Only admins can read/write
create policy "Admins can manage ai_pipeline_logs"
on public.ai_pipeline_logs for all
using (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and role in ('admin', 'moderator')
  )
);

create policy "Admins can manage ai_settings"
on public.ai_settings for all
using (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and role in ('admin', 'moderator')
  )
);

-- 4. Indexes
create index if not exists ai_logs_created_at on public.ai_pipeline_logs (created_at desc);
create index if not exists ai_logs_status on public.ai_pipeline_logs (status, created_at desc);
create index if not exists ai_logs_difficulty on public.ai_pipeline_logs (difficulty, status);

comment on table public.ai_pipeline_logs is 'Consolidated telemetry for AI riddle generation pipeline.';
comment on table public.ai_settings is 'Global configuration for the AI engine.';
