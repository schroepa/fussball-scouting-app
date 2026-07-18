import { v4 as uuidv4 } from "uuid";
import { db, ensureSeeded, type LocalMediaBlob } from "./db";
import type {
  Club,
  Match,
  MediaRef,
  Player,
  PlayerReport,
  TeamReport,
} from "../types";

function nowIso(): string {
  return new Date().toISOString();
}

/** Erzeugt eine clientseitige UUID – verhindert ID-Kollisionen zwischen Geräten. */
export function newId(): string {
  return uuidv4();
}

export async function createClub(
  input: Omit<Club, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<Club> {
  const now = nowIso();
  const club: Club = {
    ...input,
    id: newId(),
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.clubs.add(club);
  return club;
}

/** Dedup: gleicher Verein (Quelle+externe ID) wird nicht erneut angelegt. */
export async function upsertClubByExternalRef(
  input: Omit<Club, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<{ club: Club; created: boolean }> {
  if (input.externalSource && input.externalRef) {
    const existing = await db.clubs
      .filter(
        (c) =>
          c.externalSource === input.externalSource &&
          c.externalRef === input.externalRef
      )
      .first();
    if (existing) {
      const updated: Club = {
        ...existing,
        ...input,
        id: existing.id,
        syncStatus: "pending",
        updatedAt: nowIso(),
        createdAt: existing.createdAt,
      };
      await db.clubs.put(updated);
      return { club: updated, created: false };
    }
  }

  // Fallback: Namens-Match ohne externe ID (manuell angelegte Vereine).
  const byName = await db.clubs
    .filter((c) => c.name.toLowerCase() === input.name.toLowerCase())
    .first();
  if (byName) {
    const updated: Club = {
      ...byName,
      ...input,
      id: byName.id,
      externalSource: input.externalSource ?? byName.externalSource,
      externalRef: input.externalRef ?? byName.externalRef,
      syncStatus: "pending",
      updatedAt: nowIso(),
      createdAt: byName.createdAt,
    };
    await db.clubs.put(updated);
    return { club: updated, created: false };
  }

  return { club: await createClub(input), created: true };
}

export async function listClubs(): Promise<Club[]> {
  await ensureSeeded();
  return db.clubs.orderBy("name").toArray();
}

export async function getClub(id: string): Promise<Club | undefined> {
  return db.clubs.get(id);
}

export async function createPlayer(
  input: Omit<Player, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<Player> {
  const now = nowIso();
  const player: Player = {
    ...input,
    id: newId(),
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.players.add(player);
  return player;
}

/** Dedup: gleicher Spieler (Quelle+externe ID) wird aktualisiert statt doppelt angelegt. */
export async function upsertPlayerByExternalRef(
  input: Omit<Player, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<{ player: Player; created: boolean }> {
  if (input.externalSource && input.externalRef) {
    const existing = await db.players
      .filter(
        (p) =>
          p.externalSource === input.externalSource &&
          p.externalRef === input.externalRef
      )
      .first();
    if (existing) {
      const updated: Player = {
        ...existing,
        ...input,
        id: existing.id,
        syncStatus: "pending",
        updatedAt: nowIso(),
        createdAt: existing.createdAt,
      };
      await db.players.put(updated);
      return { player: updated, created: false };
    }
  }

  return { player: await createPlayer(input), created: true };
}

export async function listPlayers(): Promise<Player[]> {
  await ensureSeeded();
  return db.players.orderBy("nachname").toArray();
}

export async function getPlayer(id: string): Promise<Player | undefined> {
  return db.players.get(id);
}

export async function createMatch(
  input: Omit<Match, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<Match> {
  const now = nowIso();
  const match: Match = {
    ...input,
    id: newId(),
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.matches.add(match);
  return match;
}

export async function upsertMatchByExternalRef(
  input: Omit<Match, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<{ match: Match; created: boolean }> {
  if (input.externalSource && input.externalRef) {
    const existing = await db.matches
      .filter(
        (m) =>
          m.externalSource === input.externalSource &&
          m.externalRef === input.externalRef
      )
      .first();
    if (existing) {
      const updated: Match = {
        ...existing,
        ...input,
        id: existing.id,
        syncStatus: "pending",
        updatedAt: nowIso(),
        createdAt: existing.createdAt,
      };
      await db.matches.put(updated);
      return { match: updated, created: false };
    }
  }

  return { match: await createMatch(input), created: true };
}

export async function listMatches(): Promise<Match[]> {
  return db.matches.orderBy("datum").reverse().toArray();
}

export async function saveMediaBlob(
  blob: Blob,
  mimeType: string
): Promise<MediaRef> {
  const key = newId();
  const record: LocalMediaBlob = {
    key,
    blob,
    mimeType,
    createdAt: nowIso(),
  };
  await db.mediaBlobs.add(record);
  return {
    id: newId(),
    typ: "foto",
    localBlobKey: key,
    syncStatus: "pending",
  };
}

export async function getMediaBlobUrl(key: string): Promise<string | undefined> {
  const record = await db.mediaBlobs.get(key);
  if (!record) return undefined;
  return URL.createObjectURL(record.blob);
}

export async function createPlayerReport(
  input: Omit<PlayerReport, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<PlayerReport> {
  const now = nowIso();
  const report: PlayerReport = {
    ...input,
    id: newId(),
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.playerReports.add(report);
  return report;
}

export async function listPlayerReports(): Promise<PlayerReport[]> {
  return db.playerReports.orderBy("datum").reverse().toArray();
}

export async function getPlayerReport(
  id: string
): Promise<PlayerReport | undefined> {
  return db.playerReports.get(id);
}

export async function listPlayerReportsForPlayer(
  playerId: string
): Promise<PlayerReport[]> {
  return db.playerReports
    .where("playerId")
    .equals(playerId)
    .reverse()
    .sortBy("datum");
}

export async function createTeamReport(
  input: Omit<TeamReport, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<TeamReport> {
  const now = nowIso();
  const report: TeamReport = {
    ...input,
    id: newId(),
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.teamReports.add(report);
  return report;
}

export async function listTeamReports(): Promise<TeamReport[]> {
  return db.teamReports.orderBy("datum").reverse().toArray();
}

export async function getTeamReport(
  id: string
): Promise<TeamReport | undefined> {
  return db.teamReports.get(id);
}

export async function countPending(): Promise<number> {
  const counts = await Promise.all([
    db.clubs.where("syncStatus").equals("pending").count(),
    db.clubs.where("syncStatus").equals("error").count(),
    db.players.where("syncStatus").equals("pending").count(),
    db.players.where("syncStatus").equals("error").count(),
    db.matches.where("syncStatus").equals("pending").count(),
    db.matches.where("syncStatus").equals("error").count(),
    db.playerReports.where("syncStatus").equals("pending").count(),
    db.playerReports.where("syncStatus").equals("error").count(),
    db.teamReports.where("syncStatus").equals("pending").count(),
    db.teamReports.where("syncStatus").equals("error").count(),
  ]);
  return counts.reduce((sum, n) => sum + n, 0);
}
