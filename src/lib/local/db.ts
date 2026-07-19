import Dexie, { type EntityTable } from "dexie";
import type {
  AttributeDefinition,
  Club,
  Match,
  Player,
  PlayerReport,
  Scout,
  TeamReport,
} from "../types";
import { DEFAULT_ATTRIBUTES } from "../attributeDefinitions";

/** Lokal gespeicherter Blob (Foto), referenziert über MediaRef.localBlobKey. */
export interface LocalMediaBlob {
  key: string;
  blob: Blob;
  mimeType: string;
  createdAt: string;
}

/**
 * Lokale, geräteseitige Datenbank (IndexedDB via Dexie).
 *
 * Jede Schreibaktion landet zuerst hier – die App funktioniert dadurch
 * vollständig offline. Datensätze mit `syncStatus: "pending"` werden vom
 * Sync-Manager (siehe src/lib/sync/syncManager.ts) bei Netzverbindung zur
 * zentralen Supabase-Datenbank hochgeladen.
 */
export class ScoutingDB extends Dexie {
  clubs!: EntityTable<Club, "id">;
  players!: EntityTable<Player, "id">;
  matches!: EntityTable<Match, "id">;
  playerReports!: EntityTable<PlayerReport, "id">;
  teamReports!: EntityTable<TeamReport, "id">;
  attributeDefinitions!: EntityTable<AttributeDefinition, "id">;
  scouts!: EntityTable<Scout, "id">;
  mediaBlobs!: EntityTable<LocalMediaBlob, "key">;

  constructor() {
    super("fussball-scouting-db");

    this.version(1).stores({
      clubs: "id, name, syncStatus, updatedAt",
      players: "id, nachname, aktuellerClubId, syncStatus, updatedAt",
      matches: "id, datum, heimClubId, gastClubId, syncStatus, updatedAt",
      playerReports:
        "id, playerId, scoutId, bezugstyp, matchId, datum, syncStatus, updatedAt",
      teamReports:
        "id, clubId, scoutId, berichtsart, bezugstyp, matchId, datum, syncStatus, updatedAt",
      attributeDefinitions: "id, giltFuer, key, reihenfolge",
      scouts: "id, email",
      mediaBlobs: "key",
    });
  }
}

export const db = new ScoutingDB();

let seeded = false;

/** Legt die Standard-Bewertungskategorien beim ersten Start lokal an. */
export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  const count = await db.attributeDefinitions.count();
  if (count === 0) {
    await db.attributeDefinitions.bulkAdd(DEFAULT_ATTRIBUTES);
  }
  seeded = true;
}
