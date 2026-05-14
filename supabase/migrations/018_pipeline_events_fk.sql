-- ================================================================
-- AdvaitAI Daily Maths Riddle — Fix Pipeline Events Foreign Key
-- Migration: 018_pipeline_events_fk
-- ================================================================

-- Change user_id to reference public.profiles instead of auth.users
-- This enables joins in the Admin API to display usernames

alter table public.pipeline_events
  drop constraint if exists pipeline_events_user_id_fkey,
  add constraint pipeline_events_user_id_fkey 
    foreign key (user_id) 
    references public.profiles(id) 
    on delete set null;

comment on column public.pipeline_events.user_id is 'Reference to public.profiles(id) of the user who triggered generation.';
