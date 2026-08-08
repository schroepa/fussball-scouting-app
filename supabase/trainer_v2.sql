-- Trainerbereich V2: Player-Links, Sequenzen, Spiel-Teilnahmen
-- Nach trainer_v1.sql in Supabase SQL Editor ausführen.

alter table public.tactical_formations
  add column if not exists sequences jsonb not null default '[]'::jsonb;

create table if not exists public.player_links (
  id uuid primary key,
  player_id_a uuid not null references public.players(id) on delete cascade,
  owner_a uuid not null references public.scouts(id),
  player_id_b uuid not null references public.players(id) on delete cascade,
  owner_b uuid not null references public.scouts(id),
  match_score integer not null default 0,
  status text not null default 'vorgeschlagen',
  confirmed_by_a boolean not null default false,
  confirmed_by_b boolean not null default false,
  confirmed_at timestamptz,
  preview_a jsonb not null default '{}'::jsonb,
  preview_b jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists player_links_owners_idx
  on public.player_links (owner_a, owner_b);

create table if not exists public.game_participations (
  id uuid primary key,
  game_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid not null references public.players(id) on delete cascade,
  position text,
  minuten_von integer,
  minuten_bis integer,
  rolle text not null default 'startxi',
  created_by uuid not null references public.scouts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_participations_game_idx
  on public.game_participations (game_id, created_by);

alter table public.player_links enable row level security;
alter table public.game_participations enable row level security;

drop policy if exists player_links_party_all on public.player_links;
create policy player_links_party_all on public.player_links
  for all using (owner_a = auth.uid() or owner_b = auth.uid())
  with check (owner_a = auth.uid() or owner_b = auth.uid());

drop policy if exists game_participations_owner_all on public.game_participations;
create policy game_participations_owner_all on public.game_participations
  for all using (created_by = auth.uid())
  with check (created_by = auth.uid());
