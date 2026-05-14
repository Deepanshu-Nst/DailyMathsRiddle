-- ================================================================
-- AdvaitAI Daily Maths Riddle — Challenge & Dispute System
-- Migration: 015_challenge_system
-- ================================================================

-- 1. Create challenge_submissions table
create table if not exists public.challenge_submissions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid,
    riddle_id uuid references public.riddles(id) on delete cascade,
    proposed_answer text not null,
    reasoning text not null,
    proof_text text,
    status text not null default 'pending' 
        check (status in ('pending', 'approved', 'rejected', 'rewarded')),
    admin_notes text,
    reviewed_by uuid,
    created_at timestamptz default now()
);

-- Ensure foreign keys point to profiles (fix for previous references to auth.users)
alter table public.challenge_submissions 
  drop constraint if exists challenge_submissions_user_id_fkey,
  drop constraint if exists challenge_submissions_reviewed_by_fkey;

alter table public.challenge_submissions 
  add constraint challenge_submissions_user_id_fkey 
  foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.challenge_submissions 
  add constraint challenge_submissions_reviewed_by_fkey 
  foreign key (reviewed_by) references public.profiles(id) on delete set null;

-- 2. Add is_invalid to riddles
alter table public.riddles 
add column if not exists is_invalid boolean not null default false;

-- 3. Add RLS for challenge_submissions
alter table public.challenge_submissions enable row level security;

-- Users can view their own submissions
drop policy if exists "Users can view own challenges" on public.challenge_submissions;
create policy "Users can view own challenges"
on public.challenge_submissions for select
using (auth.uid() = user_id);

-- Users can insert challenges if authenticated
drop policy if exists "Users can submit challenges" on public.challenge_submissions;
create policy "Users can submit challenges"
on public.challenge_submissions for insert
with check (auth.uid() = user_id);

-- Admins can view all and update
drop policy if exists "Admins can manage challenges" on public.challenge_submissions;
create policy "Admins can manage challenges"
on public.challenge_submissions for all
using (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and role in ('admin', 'moderator')
  )
);

-- 4. Enable index for status
create index if not exists challenge_submissions_status_idx on public.challenge_submissions (status);
create index if not exists challenge_submissions_riddle_id_idx on public.challenge_submissions (riddle_id);

-- 5. Backfill/Ensure types
comment on table public.challenge_submissions is 'User disputes for riddle answers.';
