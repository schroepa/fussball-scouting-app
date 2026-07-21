import { getSupabaseClient, isSupabaseConfigured } from "../supabase/client";
import { getCurrentSession } from "../auth/session";
import { db } from "../local/db";
import { purgeForeignLocalData } from "../local/repository";
import type {
  Bezugstyp,
  Berichtsart,
  Club,
  Empfehlung,
  Match,
  Player,
  PlayerReport,
  SyncStatus,
  TeamReport,
} from "../types";

export interface SyncResult {
  ok: boolean;
  synced: number;
  pulled: number;
  failed: number;
  message: string;
}

type LocalRow = { id: string; syncStatus: SyncStatus; updatedAt: string };

/**
 * Volle Sync-Runde: lokale Pending-Änderungen pushen, dann Remote in Dexie
 * ziehen. Ohne Pull bleiben Geräte mit getrennten IndexedDBs isoliert.
 */
export async function syncAll(): Promise<SyncResult> {
  const session = await getCurrentSession();
  if (session.isAuthenticated) {
    await purgeForeignLocalData(session.scout.id);
  }

  const push = await pushPendingChanges();
  if (!push.ok && push.message.includes("nicht konfiguriert")) {
    return { ...push, pulled: 0 };
  }
  if (!push.ok && push.message.includes("anmelden")) {
    return { ...push, pulled: 0 };
  }
  if (!push.ok && push.message.includes("Keine Internetverbindung")) {
    return { ...push, pulled: 0 };
  }

  const pull = await pullRemoteChanges();
  const synced = push.synced;
  const pulled = pull.pulled;
  const failed = push.failed + pull.failed;
  const ok = push.ok && pull.ok;

  let message: string;
  if (!ok) {
    message = [push.message, pull.message].filter(Boolean).join(" · ");
  } else if (synced === 0 && pulled === 0) {
    message = "Alles aktuell – nichts zu synchronisieren.";
  } else {
    const parts: string[] = [];
    if (synced > 0) parts.push(`${synced} hochgeladen`);
    if (pulled > 0) parts.push(`${pulled} heruntergeladen`);
    message = parts.join(", ") + ".";
  }

  return { ok, synced, pulled, failed, message };
}

/**
 * Outbox-Sync: schiebt alle lokal als "pending"/"error" markierten Datensätze
 * zur zentralen Supabase-Datenbank (Last-Write-Wins via Upsert auf `id`).
 */
export async function pushPendingChanges(): Promise<SyncResult> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      synced: 0,
      pulled: 0,
      failed: 0,
      message:
        "Supabase ist nicht konfiguriert – Berichte werden nur lokal gespeichert.",
    };
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      ok: false,
      synced: 0,
      pulled: 0,
      failed: 0,
      message: "Keine Internetverbindung – Sync wird übersprungen.",
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      synced: 0,
      pulled: 0,
      failed: 0,
      message: "Kein Supabase-Client.",
    };
  }

  const session = await getCurrentSession();
  if (!session.isAuthenticated) {
    return {
      ok: false,
      synced: 0,
      pulled: 0,
      failed: 0,
      message: "Bitte zuerst anmelden, bevor synchronisiert wird.",
    };
  }

  const { error: scoutError } = await supabase.from("scouts").upsert(
    {
      id: session.scout.id,
      name: session.scout.name,
      email: session.scout.email,
      auth_provider: session.scout.authProvider ?? "google",
    },
    { onConflict: "id" }
  );
  if (scoutError) {
    return {
      ok: false,
      synced: 0,
      pulled: 0,
      failed: 0,
      message: `Scout konnte nicht synchronisiert werden: ${scoutError.message}`,
    };
  }

  await reassignPendingReportsToScout(session.scout.id);

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  const track = (result: { synced: number; failed: number; error?: string }) => {
    synced += result.synced;
    failed += result.failed;
    if (result.error) errors.push(result.error);
  };

  track(
    await syncTable<Club>(db.clubs, "clubs", (c) => ({
      id: c.id,
      name: c.name,
      land: c.land,
      liga: c.liga ?? null,
      logo_url: c.logoUrl ?? null,
      external_source: c.externalSource ?? null,
      external_ref: c.externalRef ?? null,
      custom_fields: c.customFields ?? {},
      created_by: c.ownerScoutId ?? session.scout.id,
      updated_at: c.updatedAt,
      created_at: c.createdAt,
    }))
  );

  track(
    await syncTable<Player>(db.players, "players", (p) => ({
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
      created_by: p.ownerScoutId ?? session.scout.id,
      updated_at: p.updatedAt,
      created_at: p.createdAt,
    }))
  );

  track(
    await syncTable<Match>(db.matches, "matches", (m) => ({
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
      created_by: m.ownerScoutId ?? session.scout.id,
      updated_at: m.updatedAt,
      created_at: m.createdAt,
    }))
  );

  track(
    await syncTable<PlayerReport>(db.playerReports, "player_reports", (r) => ({
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
    }))
  );

  track(
    await syncTable<TeamReport>(db.teamReports, "team_reports", (r) => ({
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
    }))
  );

  if (failed === 0) {
    return {
      ok: true,
      synced,
      pulled: 0,
      failed,
      message:
        synced === 0
          ? "Keine lokalen Änderungen zum Hochladen."
          : `${synced} Datensätze hochgeladen.`,
    };
  }

  return {
    ok: false,
    synced,
    pulled: 0,
    failed,
    message: `${synced} hochgeladen, ${failed} fehlgeschlagen${
      errors[0] ? `: ${errors[0]}` : "."
    }`,
  };
}

/** Lädt Stammdaten und Berichte von Supabase in die lokale Dexie-DB. */
export async function pullRemoteChanges(): Promise<SyncResult> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      synced: 0,
      pulled: 0,
      failed: 0,
      message: "Supabase ist nicht konfiguriert.",
    };
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      ok: false,
      synced: 0,
      pulled: 0,
      failed: 0,
      message: "Keine Internetverbindung – Pull übersprungen.",
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      synced: 0,
      pulled: 0,
      failed: 0,
      message: "Kein Supabase-Client.",
    };
  }

  const session = await getCurrentSession();
  if (!session.isAuthenticated) {
    return {
      ok: false,
      synced: 0,
      pulled: 0,
      failed: 0,
      message: "Bitte zuerst anmelden.",
    };
  }

  let pulled = 0;
  let failed = 0;
  const errors: string[] = [];

  const track = (result: { pulled: number; failed: number; error?: string }) => {
    pulled += result.pulled;
    failed += result.failed;
    if (result.error) errors.push(result.error);
  };

  track(
    await pullTable<Club>("clubs", db.clubs, (row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      land: String(row.land ?? "Deutschland"),
      liga: (row.liga as string | null) ?? undefined,
      logoUrl: (row.logo_url as string | null) ?? undefined,
      externalSource: (row.external_source as string | null) ?? undefined,
      externalRef: (row.external_ref as string | null) ?? undefined,
      ownerScoutId: (row.created_by as string | null) ?? session.scout.id,
      customFields:
        (row.custom_fields as Record<string, unknown> | null) ?? undefined,
      syncStatus: "synced",
      updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
    }))
  );

  track(
    await pullTable<Player>("players", db.players, (row) => ({
      id: String(row.id),
      vorname: String(row.vorname ?? ""),
      nachname: String(row.nachname ?? ""),
      geburtsdatum: (row.geburtsdatum as string | null) ?? undefined,
      nationalitaet: (row.nationalitaet as string | null) ?? undefined,
      positionen: Array.isArray(row.positionen)
        ? (row.positionen as string[])
        : [],
      starkerFuss:
        (row.starker_fuss as Player["starkerFuss"] | null) ?? undefined,
      groesseCm: (row.groesse_cm as number | null) ?? undefined,
      aktuellerClubId: (row.aktueller_club_id as string | null) ?? undefined,
      fotoUrl: (row.foto_url as string | null) ?? undefined,
      externalSource: (row.external_source as string | null) ?? undefined,
      externalRef: (row.external_ref as string | null) ?? undefined,
      ownerScoutId: (row.created_by as string | null) ?? session.scout.id,
      customFields:
        (row.custom_fields as Record<string, unknown> | null) ?? undefined,
      syncStatus: "synced",
      updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
    }))
  );

  track(
    await pullTable<Match>("matches", db.matches, (row) => ({
      id: String(row.id),
      heimClubId: (row.heim_club_id as string | null) ?? undefined,
      heimClubName: String(row.heim_club_name ?? ""),
      gastClubId: (row.gast_club_id as string | null) ?? undefined,
      gastClubName: String(row.gast_club_name ?? ""),
      wettbewerb: (row.wettbewerb as string | null) ?? undefined,
      datum: iso(row.datum) ?? new Date().toISOString(),
      spielort: (row.spielort as string | null) ?? undefined,
      externalSource: (row.external_source as string | null) ?? undefined,
      externalRef: (row.external_ref as string | null) ?? undefined,
      ownerScoutId: (row.created_by as string | null) ?? session.scout.id,
      syncStatus: "synced",
      updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
    }))
  );

  track(
    await pullTable<PlayerReport>("player_reports", db.playerReports, (row) => ({
      id: String(row.id),
      playerId: String(row.player_id),
      scoutId: String(row.scout_id),
      bezugstyp: row.bezugstyp as Bezugstyp,
      matchId: (row.match_id as string | null) ?? undefined,
      datum: iso(row.datum) ?? new Date().toISOString(),
      positionBeobachtet:
        (row.position_beobachtet as string | null) ?? undefined,
      ratings: Array.isArray(row.ratings) ? row.ratings : [],
      gesamtbewertung: (row.gesamtbewertung as number | null) ?? undefined,
      staerken: (row.staerken as string | null) ?? undefined,
      schwaechen: (row.schwaechen as string | null) ?? undefined,
      freitextNotizen: (row.freitext_notizen as string | null) ?? undefined,
      empfehlung: (row.empfehlung as Empfehlung | null) ?? undefined,
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      media: [],
      customFields:
        (row.custom_fields as Record<string, unknown> | null) ?? undefined,
      syncStatus: "synced",
      updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
    }))
  );

  track(
    await pullTable<TeamReport>("team_reports", db.teamReports, (row) => ({
      id: String(row.id),
      clubId: String(row.club_id),
      scoutId: String(row.scout_id),
      berichtsart: row.berichtsart as Berichtsart,
      bezugstyp: row.bezugstyp as Bezugstyp,
      matchId: (row.match_id as string | null) ?? undefined,
      datum: iso(row.datum) ?? new Date().toISOString(),
      formation: (row.formation as string | null) ?? undefined,
      spielstil: (row.spielstil as string | null) ?? undefined,
      standardsituationen:
        (row.standardsituationen as string | null) ?? undefined,
      staerken: (row.staerken as string | null) ?? undefined,
      schwaechen: (row.schwaechen as string | null) ?? undefined,
      schluesselspielerIds: Array.isArray(row.schluesselspieler_ids)
        ? (row.schluesselspieler_ids as string[])
        : [],
      media: [],
      customFields:
        (row.custom_fields as Record<string, unknown> | null) ?? undefined,
      syncStatus: "synced",
      updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
    }))
  );

  if (failed === 0) {
    return {
      ok: true,
      synced: 0,
      pulled,
      failed,
      message:
        pulled === 0
          ? "Keine neuen Daten vom Server."
          : `${pulled} Datensätze heruntergeladen.`,
    };
  }

  return {
    ok: false,
    synced: 0,
    pulled,
    failed,
    message: `Pull: ${pulled} ok, ${failed} Fehler${
      errors[0] ? `: ${errors[0]}` : "."
    }`,
  };
}

function iso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  try {
    return new Date(value as string | number | Date).toISOString();
  } catch {
    return undefined;
  }
}

async function reassignPendingReportsToScout(scoutId: string): Promise<void> {
  const [pendingPlayers, errorPlayers, pendingTeams, errorTeams] =
    await Promise.all([
      db.playerReports.where("syncStatus").equals("pending").toArray(),
      db.playerReports.where("syncStatus").equals("error").toArray(),
      db.teamReports.where("syncStatus").equals("pending").toArray(),
      db.teamReports.where("syncStatus").equals("error").toArray(),
    ]);

  const playerReports = [...pendingPlayers, ...errorPlayers];
  const teamReports = [...pendingTeams, ...errorTeams];

  await Promise.all([
    ...playerReports
      .filter((r) => r.scoutId !== scoutId)
      .map((r) =>
        db.playerReports.update(r.id, {
          scoutId,
          syncStatus: "pending",
          updatedAt: new Date().toISOString(),
        })
      ),
    ...teamReports
      .filter((r) => r.scoutId !== scoutId)
      .map((r) =>
        db.teamReports.update(r.id, {
          scoutId,
          syncStatus: "pending",
          updatedAt: new Date().toISOString(),
        })
      ),
  ]);
}

async function syncTable<T extends { id: string; syncStatus: string }>(
  table: {
    where(field: string): { equals(v: string): { toArray(): Promise<T[]> } };
    update(id: string, changes: Partial<T>): Promise<number>;
  },
  tableName: string,
  toRemote: (row: T) => Record<string, unknown>
): Promise<{ synced: number; failed: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { synced: 0, failed: 0 };

  const pending = (
    await Promise.all([
      table.where("syncStatus").equals("pending").toArray(),
      table.where("syncStatus").equals("error").toArray(),
    ])
  ).flat();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  let firstError: string | undefined;

  for (const row of pending) {
    const { error } = await supabase
      .from(tableName)
      .upsert(toRemote(row), { onConflict: "id" });

    if (error) {
      failed += 1;
      if (!firstError) {
        firstError = `${tableName}: ${error.message}`;
      }
      await table.update(row.id, { syncStatus: "error" } as Partial<T>);
      continue;
    }

    await table.update(row.id, { syncStatus: "synced" } as Partial<T>);
    synced += 1;
  }

  return { synced, failed, error: firstError };
}

async function pullTable<T extends LocalRow>(
  tableName: string,
  table: {
    get(id: string): Promise<T | undefined>;
    put(row: T): Promise<string>;
  },
  fromRemote: (row: Record<string, unknown>) => T
): Promise<{ pulled: number; failed: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { pulled: 0, failed: 0 };

  const pageSize = 1000;
  let from = 0;
  let pulled = 0;
  let failed = 0;
  let firstError: string | undefined;

  for (;;) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("updated_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      return {
        pulled,
        failed: failed + 1,
        error: `${tableName}: ${error.message}`,
      };
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) break;

    for (const remote of rows) {
      try {
        const mapped = fromRemote(remote);
        const local = await table.get(mapped.id);

        // Lokale unveröffentlichte Änderungen nicht überschreiben.
        if (local && (local.syncStatus === "pending" || local.syncStatus === "error")) {
          continue;
        }

        if (
          local &&
          new Date(local.updatedAt).getTime() > new Date(mapped.updatedAt).getTime()
        ) {
          continue;
        }

        // Lokale Media-Refs bei Berichten behalten, falls vorhanden.
        if (local && "media" in local && "media" in mapped) {
          const localMedia = (local as { media?: unknown }).media;
          if (Array.isArray(localMedia) && localMedia.length > 0) {
            (mapped as { media: unknown }).media = localMedia;
          }
        }

        if (!local || JSON.stringify(stripSyncCompare(local)) !== JSON.stringify(stripSyncCompare(mapped))) {
          await table.put(mapped);
          pulled += 1;
        }
      } catch (err) {
        failed += 1;
        if (!firstError) {
          firstError = `${tableName}: ${(err as Error).message}`;
        }
      }
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return { pulled, failed, error: firstError };
}

function stripSyncCompare(row: LocalRow): unknown {
  const { syncStatus: _s, ...rest } = row;
  return rest;
}

let autoSyncRegistered = false;

/** Auto-Sync bei Wiederverbindung + einmalig beim Start. */
export function registerAutoSync(onResult?: (r: SyncResult) => void): void {
  if (autoSyncRegistered || typeof window === "undefined") return;
  autoSyncRegistered = true;

  const run = async () => {
    const result = await syncAll();
    onResult?.(result);
    if (result.ok && (result.synced > 0 || result.pulled > 0)) {
      window.dispatchEvent(new Event("scouting:synced"));
    }
  };

  window.addEventListener("online", () => {
    void run();
  });

  // Initialer Pull, sobald die App online und eingeloggt ist.
  if (navigator.onLine) {
    void run();
  }
}
