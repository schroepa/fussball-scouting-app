-- ============================================================
-- Fussball Scouting App – einmaliges Supabase-Setup
-- Im Supabase-Dashboard → SQL Editor komplett einfügen und Run.
-- ============================================================

-- ---------- 1) Tabellen ----------

CREATE TABLE "attribute_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"gilt_fuer" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"typ" text NOT NULL,
	"skala_min" integer,
	"skala_max" integer,
	"auswahl_optionen" jsonb,
	"gruppe" text,
	"ist_custom" boolean DEFAULT true NOT NULL,
	"reihenfolge" integer DEFAULT 100 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"land" text DEFAULT 'Deutschland' NOT NULL,
	"liga" text,
	"logo_url" text,
	"external_source" text,
	"external_ref" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"heim_club_id" uuid,
	"heim_club_name" text NOT NULL,
	"gast_club_id" uuid,
	"gast_club_name" text NOT NULL,
	"wettbewerb" text,
	"datum" timestamp with time zone NOT NULL,
	"spielort" text,
	"formation_heim_off" text,
	"formation_heim_def" text,
	"formation_gast_off" text,
	"formation_gast_def" text,
	"phases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_url" text,
	"video_ref" text,
	"video_markers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"external_source" text,
	"external_ref" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"report_typ" text NOT NULL,
	"report_id" uuid NOT NULL,
	"typ" text NOT NULL,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "player_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"scout_id" uuid NOT NULL,
	"bezugstyp" text NOT NULL,
	"match_id" uuid,
	"datum" timestamp with time zone NOT NULL,
	"position_beobachtet" text,
	"ratings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gesamtbewertung" integer,
	"staerken" text,
	"schwaechen" text,
	"freitext_notizen" text,
	"empfehlung" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "players" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vorname" text NOT NULL,
	"nachname" text NOT NULL,
	"geburtsdatum" text,
	"nationalitaet" text,
	"positionen" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"starker_fuss" text,
	"groesse_cm" integer,
	"aktueller_club_id" uuid,
	"foto_url" text,
	"external_source" text,
	"external_ref" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "scouts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"auth_provider" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "team_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"scout_id" uuid NOT NULL,
	"berichtsart" text NOT NULL,
	"bezugstyp" text NOT NULL,
	"match_id" uuid,
	"datum" timestamp with time zone NOT NULL,
	"formation" text,
	"spielstil" text,
	"standardsituationen" text,
	"staerken" text,
	"schwaechen" text,
	"schluesselspieler_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "attribute_definitions" ADD CONSTRAINT "attribute_definitions_created_by_scouts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_created_by_scouts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "matches" ADD CONSTRAINT "matches_heim_club_id_clubs_id_fk" FOREIGN KEY ("heim_club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "matches" ADD CONSTRAINT "matches_gast_club_id_clubs_id_fk" FOREIGN KEY ("gast_club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_scouts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_scout_id_scouts_id_fk" FOREIGN KEY ("scout_id") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "players" ADD CONSTRAINT "players_aktueller_club_id_clubs_id_fk" FOREIGN KEY ("aktueller_club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "players" ADD CONSTRAINT "players_created_by_scouts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "team_reports" ADD CONSTRAINT "team_reports_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "team_reports" ADD CONSTRAINT "team_reports_scout_id_scouts_id_fk" FOREIGN KEY ("scout_id") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "team_reports" ADD CONSTRAINT "team_reports_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
-- ---------- 2) Trigger + RLS Policies ----------

-- Row Level Security (RLS) Policies für die Fussball-Scouting-App.
--
-- Nach dem Anlegen der Tabellen (supabase/migrations/*.sql, per
-- `npm run db:push` oder manuell im Supabase SQL-Editor) dieses Skript
-- EINMALIG im Supabase SQL-Editor ausführen.
--
-- Grundprinzip (siehe docs/PLANNING.md):
-- - Alle Scouts sind gleichberechtigte Nutzer und sehen sich gegenseitig
--   erfasste Stammdaten und Berichte (geteiltes Team-Wissen).
-- - Stammdaten (Vereine, Spieler, Spiele, Bewertungs-Kategorien) können von
--   jedem eingeloggten Scout angelegt und bearbeitet werden (niedriges
--   Konfliktrisiko, gemeinsame Datenbasis).
-- - Scouting-Berichte gehören genau einem Scout: jeder darf alle Berichte
--   LESEN, aber nur seine eigenen erstellen/bearbeiten/löschen.

-- 1) Automatisch einen `scouts`-Eintrag anlegen, wenn sich ein neuer Nutzer
--    über Supabase Auth registriert (Google OAuth oder Magic Link).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.scouts (id, name, email, auth_provider)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Scout'),
    coalesce(new.email, ''),
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- 2) RLS aktivieren
alter table public.scouts enable row level security;
alter table public.clubs enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.player_reports enable row level security;
alter table public.team_reports enable row level security;
alter table public.media enable row level security;
alter table public.attribute_definitions enable row level security;

-- 3) scouts
create policy "scouts_select_all_authenticated" on public.scouts
  for select to authenticated using (true);
create policy "scouts_insert_own" on public.scouts
  for insert to authenticated with check (id = auth.uid());
create policy "scouts_update_own" on public.scouts
  for update to authenticated using (id = auth.uid());

-- 4) Stammdaten: clubs, players, matches, attribute_definitions
create policy "clubs_select_all_authenticated" on public.clubs
  for select to authenticated using (true);
create policy "clubs_insert_authenticated" on public.clubs
  for insert to authenticated with check (true);
create policy "clubs_update_authenticated" on public.clubs
  for update to authenticated using (true);

create policy "players_select_all_authenticated" on public.players
  for select to authenticated using (true);
create policy "players_insert_authenticated" on public.players
  for insert to authenticated with check (true);
create policy "players_update_authenticated" on public.players
  for update to authenticated using (true);

create policy "matches_select_all_authenticated" on public.matches
  for select to authenticated using (true);
create policy "matches_insert_authenticated" on public.matches
  for insert to authenticated with check (true);
create policy "matches_update_authenticated" on public.matches
  for update to authenticated using (true);

create policy "attribute_definitions_select_all_authenticated" on public.attribute_definitions
  for select to authenticated using (true);
create policy "attribute_definitions_insert_authenticated" on public.attribute_definitions
  for insert to authenticated with check (true);

-- 5) Berichte: geteilt lesbar, aber nur vom jeweiligen Scout bearbeitbar
create policy "player_reports_select_all_authenticated" on public.player_reports
  for select to authenticated using (true);
create policy "player_reports_insert_own" on public.player_reports
  for insert to authenticated with check (scout_id = auth.uid());
create policy "player_reports_update_own" on public.player_reports
  for update to authenticated using (scout_id = auth.uid());
create policy "player_reports_delete_own" on public.player_reports
  for delete to authenticated using (scout_id = auth.uid());

create policy "team_reports_select_all_authenticated" on public.team_reports
  for select to authenticated using (true);
create policy "team_reports_insert_own" on public.team_reports
  for insert to authenticated with check (scout_id = auth.uid());
create policy "team_reports_update_own" on public.team_reports
  for update to authenticated using (scout_id = auth.uid());
create policy "team_reports_delete_own" on public.team_reports
  for delete to authenticated using (scout_id = auth.uid());

-- 6) media (Fotos/Videos zu Berichten)
create policy "media_select_all_authenticated" on public.media
  for select to authenticated using (true);
create policy "media_insert_authenticated" on public.media
  for insert to authenticated with check (true);
create policy "media_delete_authenticated" on public.media
  for delete to authenticated using (true);
