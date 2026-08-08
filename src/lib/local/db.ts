import Dexie, { type EntityTable } from "dexie";
import type {
  AttributeDefinition,
  Club,
  Match,
  Player,
  PlayerReport,
  PlayerShare,
  Scout,
  SquadMembership,
  TacticalFormation,
  Team,
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
 * Datensätze mit `syncStatus: "pending"` werden vom Sync-Manager hochgeladen.
 * Stammdaten sind owner-scoped (`ownerScoutId`).
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
  teams!: EntityTable<Team, "id">;
  squadMemberships!: EntityTable<SquadMembership, "id">;
  playerShares!: EntityTable<PlayerShare, "id">;
  tacticalFormations!: EntityTable<TacticalFormation, "id">;

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

    this.version(2).stores({
      clubs: "id, name, ownerScoutId, syncStatus, updatedAt",
      players: "id, nachname, aktuellerClubId, ownerScoutId, syncStatus, updatedAt",
      matches: "id, datum, heimClubId, gastClubId, ownerScoutId, syncStatus, updatedAt",
      playerReports:
        "id, playerId, scoutId, bezugstyp, matchId, datum, syncStatus, updatedAt",
      teamReports:
        "id, clubId, scoutId, berichtsart, bezugstyp, matchId, datum, syncStatus, updatedAt",
      attributeDefinitions: "id, giltFuer, key, reihenfolge",
      scouts: "id, email",
      mediaBlobs: "key",
    });

    this.version(3).stores({
      clubs: "id, name, ownerScoutId, syncStatus, updatedAt",
      players: "id, nachname, aktuellerClubId, ownerScoutId, syncStatus, updatedAt",
      matches: "id, datum, heimClubId, gastClubId, ownerScoutId, syncStatus, updatedAt",
      playerReports:
        "id, playerId, scoutId, bezugstyp, matchId, datum, syncStatus, updatedAt",
      teamReports:
        "id, clubId, scoutId, berichtsart, bezugstyp, matchId, datum, syncStatus, updatedAt",
      attributeDefinitions: "id, giltFuer, key, reihenfolge, ownerScoutId, syncStatus",
      scouts: "id, email",
      mediaBlobs: "key",
    });

    this.version(4).stores({
      clubs: "id, name, ownerScoutId, syncStatus, updatedAt",
      players: "id, nachname, aktuellerClubId, ownerScoutId, jahrgang, syncStatus, updatedAt",
      matches: "id, datum, heimClubId, gastClubId, ownerScoutId, syncStatus, updatedAt",
      playerReports:
        "id, playerId, scoutId, bezugstyp, matchId, datum, syncStatus, updatedAt",
      teamReports:
        "id, clubId, scoutId, berichtsart, bezugstyp, matchId, datum, syncStatus, updatedAt",
      attributeDefinitions: "id, giltFuer, key, reihenfolge, ownerScoutId, syncStatus",
      scouts: "id, email",
      mediaBlobs: "key",
      teams: "id, name, ageGroup, ownerScoutId, syncStatus, updatedAt",
      squadMemberships:
        "id, teamId, playerId, consentStatus, ownerScoutId, syncStatus, updatedAt",
      playerShares:
        "id, playerId, ownerScoutId, inviteCode, acceptedByScoutId, status, syncStatus, updatedAt",
      tacticalFormations: "id, teamId, name, ownerScoutId, syncStatus, updatedAt",
    });
  }
}

export const db = new ScoutingDB();

let seeded = false;

/** Legt die Standard-Bewertungskategorien beim ersten Start lokal an. */
export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  for (const def of DEFAULT_ATTRIBUTES) {
    const existing = await db.attributeDefinitions.get(def.id);
    if (!existing) {
      await db.attributeDefinitions.add(def);
    }
  }
  seeded = true;
}
