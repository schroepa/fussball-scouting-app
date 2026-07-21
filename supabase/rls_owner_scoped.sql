-- ============================================================
-- RLS: Owner-scoped (Datentrennung pro Scout)
-- Einmalig im Supabase SQL-Editor AUSFÜHREN (ersetzt die alten
-- "alle Authenticated sehen alles"-Policies).
-- Siehe docs/PLANNING.md Abschnitt 3 / M3.5
-- ============================================================

-- Alte Policies droppen (Namen aus policies.sql / setup.sql)
drop policy if exists "clubs_select_all_authenticated" on public.clubs;
drop policy if exists "clubs_insert_authenticated" on public.clubs;
drop policy if exists "clubs_update_authenticated" on public.clubs;

drop policy if exists "players_select_all_authenticated" on public.players;
drop policy if exists "players_insert_authenticated" on public.players;
drop policy if exists "players_update_authenticated" on public.players;

drop policy if exists "matches_select_all_authenticated" on public.matches;
drop policy if exists "matches_insert_authenticated" on public.matches;
drop policy if exists "matches_update_authenticated" on public.matches;

drop policy if exists "player_reports_select_all_authenticated" on public.player_reports;
drop policy if exists "team_reports_select_all_authenticated" on public.team_reports;

drop policy if exists "media_select_all_authenticated" on public.media;
drop policy if exists "media_insert_authenticated" on public.media;
drop policy if exists "media_delete_authenticated" on public.media;

-- Optional: bereits angelegte Owner-Policies erneut anlegen
drop policy if exists "clubs_select_own" on public.clubs;
drop policy if exists "clubs_insert_own" on public.clubs;
drop policy if exists "clubs_update_own" on public.clubs;
drop policy if exists "clubs_delete_own" on public.clubs;

drop policy if exists "players_select_own" on public.players;
drop policy if exists "players_insert_own" on public.players;
drop policy if exists "players_update_own" on public.players;
drop policy if exists "players_delete_own" on public.players;

drop policy if exists "matches_select_own" on public.matches;
drop policy if exists "matches_insert_own" on public.matches;
drop policy if exists "matches_update_own" on public.matches;
drop policy if exists "matches_delete_own" on public.matches;

drop policy if exists "player_reports_select_own" on public.player_reports;
drop policy if exists "team_reports_select_own" on public.team_reports;

drop policy if exists "media_select_own_reports" on public.media;
drop policy if exists "media_insert_own" on public.media;
drop policy if exists "media_delete_own" on public.media;

-- Stammdaten: nur eigener Scout (created_by)
create policy "clubs_select_own" on public.clubs
  for select to authenticated using (created_by = auth.uid());
create policy "clubs_insert_own" on public.clubs
  for insert to authenticated with check (created_by = auth.uid());
create policy "clubs_update_own" on public.clubs
  for update to authenticated using (created_by = auth.uid());
create policy "clubs_delete_own" on public.clubs
  for delete to authenticated using (created_by = auth.uid());

create policy "players_select_own" on public.players
  for select to authenticated using (created_by = auth.uid());
create policy "players_insert_own" on public.players
  for insert to authenticated with check (created_by = auth.uid());
create policy "players_update_own" on public.players
  for update to authenticated using (created_by = auth.uid());
create policy "players_delete_own" on public.players
  for delete to authenticated using (created_by = auth.uid());

create policy "matches_select_own" on public.matches
  for select to authenticated using (created_by = auth.uid());
create policy "matches_insert_own" on public.matches
  for insert to authenticated with check (created_by = auth.uid());
create policy "matches_update_own" on public.matches
  for update to authenticated using (created_by = auth.uid());
create policy "matches_delete_own" on public.matches
  for delete to authenticated using (created_by = auth.uid());

-- Berichte: nur eigener Scout lesen (Schreiben war schon own)
create policy "player_reports_select_own" on public.player_reports
  for select to authenticated using (scout_id = auth.uid());

create policy "team_reports_select_own" on public.team_reports
  for select to authenticated using (scout_id = auth.uid());

-- Media: nur zu eigenen Berichten (player_reports / team_reports)
create policy "media_select_own_reports" on public.media
  for select to authenticated using (
    (
      report_typ = 'player_report'
      and exists (
        select 1 from public.player_reports pr
        where pr.id = media.report_id and pr.scout_id = auth.uid()
      )
    )
    or (
      report_typ = 'team_report'
      and exists (
        select 1 from public.team_reports tr
        where tr.id = media.report_id and tr.scout_id = auth.uid()
      )
    )
  );

create policy "media_insert_own" on public.media
  for insert to authenticated with check (
    (
      report_typ = 'player_report'
      and exists (
        select 1 from public.player_reports pr
        where pr.id = media.report_id and pr.scout_id = auth.uid()
      )
    )
    or (
      report_typ = 'team_report'
      and exists (
        select 1 from public.team_reports tr
        where tr.id = media.report_id and tr.scout_id = auth.uid()
      )
    )
  );

create policy "media_delete_own" on public.media
  for delete to authenticated using (
    (
      report_typ = 'player_report'
      and exists (
        select 1 from public.player_reports pr
        where pr.id = media.report_id and pr.scout_id = auth.uid()
      )
    )
    or (
      report_typ = 'team_report'
      and exists (
        select 1 from public.team_reports tr
        where tr.id = media.report_id and tr.scout_id = auth.uid()
      )
    )
  );

-- Altbestand ohne created_by: dem aktuellen User zuordnen, der das Skript
-- ausführt, geht nicht pauschal. Empfohlen manuell:
--   update public.players set created_by = '<deine-scout-uuid>' where created_by is null;
--   analog clubs / matches
-- Oder Testdaten löschen und neu importieren.
