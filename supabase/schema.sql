-- The Morning Edition schema. Run once in the Supabase SQL editor.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  -- Supabase Auth user this row belongs to.
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  -- The user id we hand to Composio. Every connected account and every tool
  -- call is scoped to this id, which is what keeps one reader's apps out of
  -- another reader's paper.
  composio_user_id text unique not null,
  display_name text,
  timezone text default 'America/New_York',
  -- { "slackChannels": [{ "id": "C123", "name": "general" }], "sections": { "gmail": true, ... } }
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists editions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  edition_number int not null,
  edition_date date not null,
  content jsonb not null,
  sources_used text[],
  generation_ms int,
  created_at timestamptz default now(),
  unique (user_id, edition_date)
);

create index if not exists editions_user_date_idx on editions (user_id, edition_date desc);

-- All reads and writes go through the server with the service role key, so
-- row level security is enabled with no policies: the anon key cannot touch
-- either table directly.
alter table users enable row level security;
alter table editions enable row level security;
