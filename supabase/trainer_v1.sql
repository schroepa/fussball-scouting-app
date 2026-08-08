-- Trainerbereich V1: Rollenfelder + Teams, Kader, Freigaben, Aufstellungen
-- In Supabase SQL Editor ausführen (nach rls_owner_scoped.sql).

-- Scout-Profil erweitern
alter table public.scouts
  add column if not exists roles jsonb not null default '["scout"]'::jsonb,
  add column if not exists primary_mode text,
  add column if not exists trainer_club_name text,
  add column if not exists trainer_age_groups jsonb not null default '[]'::jsonb;

-- Jahrgang am Spieler (Jugendschutz / Datensparsamkeit)
alter table public.players
  add column if not exists jahrgang integer;

-- Teams
create table if not exists public.teams (
  id uuid primary key,
  name text not null,
  club_id uuid references public.clubs(id),
  club_name text not null default '',
  age_group text not null,
  season text,
  created_by uuid not null references public.scouts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Kader-Mitgliedschaft inkl. Einwilligung
create table if not exists public.squad_memberships (
  id uuid primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  consent_status text not null default 'ausstehend',
  jersey_number integer,
  notes text,
  created_by uuid not null references public.scouts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, player_id)
);

-- Gezielte Freigaben (Einladungscode)
create table if not exists public.player_shares (
  id uuid primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  created_by uuid not null references public.scouts(id),
  invite_code text not null unique,
  invite_expires_at timestamptz not null,
  accepted_by uuid references public.scouts(id),
  role text not null default 'viewer',
  status text not null default 'pending',
  share_pii boolean not null default false,
  revoked_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists player_shares_invite_code_idx
  on public.player_shares (invite_code);

-- Taktik-/Aufstellungsboard (V1 ohne Bewegungspfade)
create table if not exists public.tactical_formations (
  id uuid primary key,
  name text not null,
  team_id uuid references public.teams(id) on delete set null,
  game_id uuid references public.matches(id) on delete set null,
  template_key text,
  positions_off jsonb not null default '[]'::jsonb,
  positions_def jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.scouts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.teams enable row level security;
alter table public.squad_memberships enable row level security;
alter table public.player_shares enable row level security;
alter table public.tactical_formations enable row level security;

drop policy if exists teams_owner_all on public.teams;
create policy teams_owner_all on public.teams
  for all using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists squad_memberships_owner_all on public.squad_memberships;
create policy squad_memberships_owner_all on public.squad_memberships
  for all using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists tactical_formations_owner_all on public.tactical_formations;
create policy tactical_formations_owner_all on public.tactical_formations
  for all using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Freigaben: Owner voll; Angenommene/pending per Code lesbar für Annahme
drop policy if exists player_shares_owner_all on public.player_shares;
create policy player_shares_owner_all on public.player_shares
  for all using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists player_shares_accepted_select on public.player_shares;
create policy player_shares_accepted_select on public.player_shares
  for select using (accepted_by = auth.uid());

drop policy if exists player_shares_accept_update on public.player_shares;
create policy player_shares_accept_update on public.player_shares
  for update using (
    status = 'pending'
    and invite_expires_at > now()
  )
  with check (
    accepted_by = auth.uid()
    and status = 'active'
  );

-- Lookup offener Codes (für Annahme) – nur pending, nicht abgelaufen
drop policy if exists player_shares_pending_code_select on public.player_shares;
create policy player_shares_pending_code_select on public.player_shares
  for select using (
    status = 'pending'
    and invite_expires_at > now()
  );
