import { getSupabaseClient, isSupabaseConfigured } from "../supabase/client";
import { db } from "../local/db";
import type { Club, Match, Player, PlayerReport, TeamReport } from "../types";

export interface SyncResult {
  ok: boolean;
  synced: number;
  failed: number;
  message: string;
}

/**
 * Outbox-Sync: schiebt alle lokal als "pending" markierten Datensätze zur
 * zentralen Supabase-Datenbank. Konfliktauflösung: Last-Write-Wins über
 * `updated_at` (serverseitig als Upsert-Constraint abgebildet).
 *
 * Siehe docs/PLANNING.md, Abschnitt 4, für das Gesamtkonzept.
 */
export async function pushPendingChanges(): Promise<SyncResult> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      synced: 0,
      failed: 0,
      message:
        "Supabase ist nicht konfiguriert – Berichte werden nur lokal gespeichert.",
    };
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      ok: false,
      synced: 0,
      failed: 0,
      message: "Keine Internetverbindung – Sync wird übersprungen.",
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, synced: 0, failed: 0, message: "Kein Supabase-Client." };
  }

  let synced = 0;
  let failed = 0;

  synced += await syncTable<Club>(
    db.clubs,
    "clubs",
    (c) => ({
      id: c.id,
      name: c.name,
      land: c.land,
      liga: c.liga ?? null,
      logo_url: c.logoUrl ?? null,
      external_source: c.externalSource ?? null,
      external_ref: c.externalRef ?? null,
      custom_fields: c.customFields ?? {},
      updated_at: c.updatedAt,
      created_at: c.createdAt,
    }),
    (n) => (failed += n)
  );

  synced += await syncTable<Player>(
    db.players,
    "players",
    (p) => ({
      id: p.id,
      vorname: p.vorname,
      nachname: p.nachname,
      geburtsdatum: p.geburtsdatum ?? null,
      nationalitaet: p.nationalitaet ?? null,
      positionen: p.positionen,
      starker_fuss: p.starkerFuss ?? null,
      groesse_cm: p.groesseCm ?? null,
      aktueller_club_id: p.aktuellerClubId ?? null,
      foto_url: p.fotoUrl ?? null,
      external_source: p.externalSource ?? null,
      external_ref: p.externalRef ?? null,
      custom_fields: p.customFields ?? {},
      updated_at: p.updatedAt,
      created_at: p.createdAt,
    }),
    (n) => (failed += n)
  );

  synced += await syncTable<Match>(
    db.matches,
    "matches",
    (m) => ({
      id: m.id,
      heim_club_id: m.heimClubId ?? null,
      heim_club_name: m.heimClubName,
      gast_club_id: m.gastClubId ?? null,
      gast_club_name: m.gastClubName,
      wettbewerb: m.wettbewerb ?? null,
      datum: m.datum,
      spielort: m.spielort ?? null,
      external_source: m.externalSource ?? null,
      external_ref: m.externalRef ?? null,
      updated_at: m.updatedAt,
      created_at: m.createdAt,
    }),
    (n) => (failed += n)
  );

  synced += await syncTable<PlayerReport>(
    db.playerReports,
    "player_reports",
    (r) => ({
      id: r.id,
      player_id: r.playerId,
      scout_id: r.scoutId,
      bezugstyp: r.bezugstyp,
      match_id: r.matchId ?? null,
      datum: r.datum,
      position_beobachtet: r.positionBeobachtet ?? null,
      ratings: r.ratings,
      gesamtbewertung: r.gesamtbewertung ?? null,
      staerken: r.staerken ?? null,
      schwaechen: r.schwaechen ?? null,
      freitext_notizen: r.freitextNotizen ?? null,
      empfehlung: r.empfehlung ?? null,
      tags: r.tags,
      custom_fields: r.customFields ?? {},
      updated_at: r.updatedAt,
      created_at: r.createdAt,
    }),
    (n) => (failed += n)
  );

  synced += await syncTable<TeamReport>(
    db.teamReports,
    "team_reports",
    (r) => ({
      id: r.id,
      club_id: r.clubId,
      scout_id: r.scoutId,
      berichtsart: r.berichtsart,
      bezugstyp: r.bezugstyp,
      match_id: r.matchId ?? null,
      datum: r.datum,
      formation: r.formation ?? null,
      spielstil: r.spielstil ?? null,
      standardsituationen: r.standardsituationen ?? null,
      staerken: r.staerken ?? null,
      schwaechen: r.schwaechen ?? null,
      schluesselspieler_ids: r.schluesselspielerIds,
      custom_fields: r.customFields ?? {},
      updated_at: r.updatedAt,
      created_at: r.createdAt,
    }),
    (n) => (failed += n)
  );

  return {
    ok: failed === 0,
    synced,
    failed,
    message:
      failed === 0
        ? `${synced} Datensätze erfolgreich synchronisiert.`
        : `${synced} synchronisiert, ${failed} fehlgeschlagen. Wird beim nächsten Versuch erneut geprüft.`,
  };
}

async function syncTable<T extends { id: string; syncStatus: string }>(
  table: { where(field: string): { equals(v: string): { toArray(): Promise<T[]> } }; update(id: string, changes: Partial<T>): Promise<number> },
  tableName: string,
  toRemote: (row: T) => Record<string, unknown>,
  onFailed: (count: number) => void
): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) return 0;

  const pending = await table.where("syncStatus").equals("pending").toArray();
  if (pending.length === 0) return 0;

  const { error } = await supabase
    .from(tableName)
    .upsert(pending.map(toRemote), { onConflict: "id" });

  if (error) {
    onFailed(pending.length);
    return 0;
  }

  await Promise.all(
    pending.map((row) => table.update(row.id, { syncStatus: "synced" } as Partial<T>))
  );
  return pending.length;
}

let autoSyncRegistered = false;

/** Registriert automatisches Nach-Sync bei Wiederverbindung (M0: einfache Variante). */
export function registerAutoSync(onResult?: (r: SyncResult) => void): void {
  if (autoSyncRegistered || typeof window === "undefined") return;
  autoSyncRegistered = true;
  window.addEventListener("online", async () => {
    const result = await pushPendingChanges();
    onResult?.(result);
  });
}
