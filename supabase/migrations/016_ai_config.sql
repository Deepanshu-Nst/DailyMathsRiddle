-- ================================================================
-- AdvaitAI Daily Maths Riddle — AI Configuration Plane
-- Migration: 016_ai_config
-- ================================================================

-- 1. Create ai_settings (Control plane for the generation engine)
create table if not exists public.ai_settings (
    key   text primary key,
    value jsonb not null,
    updated_at timestamptz default now()
);

-- Seed default settings
-- is_enabled: Master switch for AI generation
-- safe_mode: When true, uses more conservative models/prompts
-- max_retries: Per-request retry limit
-- mode: generation strategy (standard, creative, deterministic_priority)
insert into public.ai_settings (key, value)
values 
  ('engine_config', '{"is_enabled": true, "safe_mode": false, "max_retries": 3, "mode": "standard"}'::jsonb)
on conflict (key) do nothing;

-- 2. RLS
alter table public.ai_settings enable row level security;

-- Only admins/moderators can manage
create policy "Admins can manage ai_settings"
on public.ai_settings for all
using (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and role in ('admin', 'moderator')
  )
);

comment on table public.ai_settings is 'Global configuration and circuit breakers for the AI engine.';
