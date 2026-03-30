create table if not exists public.news_cache (
  symbol text primary key,
  data jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now()
);

alter table public.news_cache enable row level security;

create table if not exists public.market_diary_cache (
  cache_key text primary key,
  data jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

alter table public.market_diary_cache enable row level security;
