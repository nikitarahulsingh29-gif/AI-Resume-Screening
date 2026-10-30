-- AI Resume Screening demo schema (Supabase / PostgreSQL)
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  job_title text not null,
  resume_text text not null,
  screening_score integer not null check (screening_score between 0 and 100),
  matched_keywords text[] not null default '{}',
  missing_keywords text[] not null default '{}',
  status text not null default 'review_required'
    check (status in ('review_required', 'in_review', 'reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists candidates_created_at_idx
  on public.candidates (created_at desc);
create index if not exists candidates_job_title_idx
  on public.candidates (job_title);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_candidates_updated_at on public.candidates;
create trigger set_candidates_updated_at
before update on public.candidates
for each row execute function public.set_updated_at();

-- This demo accesses Supabase from the Node server using the service-role key.
-- Keep that key secret and never expose it in browser code.
-- If you later access this table directly from a browser, enable RLS and add
-- explicit, role-appropriate policies before exposing any candidate information.
alter table public.candidates enable row level security;

-- No anon/authenticated policies are created intentionally. Server-side
-- service-role access bypasses RLS; secure the server/API before production use.
