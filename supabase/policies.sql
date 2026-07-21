-- Row Level Security (RLS) Policies für die Fussball-Scouting-App.
--
-- WICHTIG (Juli 2026): Datentrennung pro Scout.
-- Für bestehende Projekte bitte zusätzlich ausführen:
--   supabase/rls_owner_scoped.sql
-- Das ersetzt die alten „alle Authenticated sehen alles“-Policies.
--
-- Grundprinzip (siehe docs/PLANNING.md):
-- - Jeder Scout sieht nur eigene Stammdaten (created_by) und eigene Berichte (scout_id).
-- - attribute_definitions bleiben als Vorlagen für alle lesbar.

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
