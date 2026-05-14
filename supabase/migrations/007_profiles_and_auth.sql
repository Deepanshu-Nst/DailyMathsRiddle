-- ================================================================
-- AdvaitAI Daily Maths Riddle — Phase 3.1: Gamification Prep
-- Migration: 007_profiles_and_auth
-- Run this SQL in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. Add columns to profiles ────────────────────────────────────
-- The `profiles` table was created in 001_auth_foundation.sql.
-- Here we add streak_count and xp to prepare for gamification.

alter table public.profiles 
add column if not exists streak_count integer not null default 0,
add column if not exists xp integer not null default 0;

comment on column public.profiles.streak_count is 'Current active streak for the user';
comment on column public.profiles.xp is 'Experience points earned by the user';

-- ── Verification ─────────────────────────────────────────────────
-- Verify columns exist:
-- select column_name, data_type, column_default 
-- from information_schema.columns 
-- where table_name = 'profiles' and column_name in ('streak_count', 'xp');
