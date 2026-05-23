create table if not exists public.leads (
  id uuid primary key,
  created_at timestamptz not null default now(),
  contact text not null,
  question text,
  file_name text,
  document_type text
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;
