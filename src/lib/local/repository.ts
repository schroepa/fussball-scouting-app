import { v4 as uuidv4 } from "uuid";
import { db, ensureSeeded, type LocalMediaBlob } from "./db";
import { getCurrentSession } from "../auth/session";
import type {
  AttributeDefinition,
  AttributeAppliesTo,
  Club,
  Match,
  MediaRef,
  Player,
  PlayerReport,
  TeamReport,
} from "../types";
import { slugifyAttributeKey } from "../attributeKey";

function nowIso(): string {
  return new Date().toISOString();
}

/** Erzeugt eine clientseitige UUID – verhindert ID-Kollisionen zwischen Geräten. */
export function newId(): string {
  return uuidv4();
}

async function currentScoutId(): Promise<string> {
  const session = await getCurrentSession();
  return session.scout.id;
}

export async function createClub(
  input: Omit<Club, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<Club> {
  const now = nowIso();
  const ownerScoutId = input.ownerScoutId ?? (await currentScoutId());
  const club: Club = {
    ...input,
    ownerScoutId,
    id: newId(),
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.clubs.add(club);
  return club;
}

/** Dedup: gleicher Verein (Quelle+externe ID) **pro Scout**. */
export async function upsertClubByExternalRef(
  input: Omit<Club, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<{ club: Club; created: boolean }> {
  const ownerScoutId = input.ownerScoutId ?? (await currentScoutId());
  const scoped = { ...input, ownerScoutId };

  if (scoped.externalSource && scoped.externalRef) {
    const existing = await db.clubs
      .filter(
        (c) =>
          c.ownerScoutId === ownerScoutId &&
          c.externalSource === scoped.externalSource &&
          c.externalRef === scoped.externalRef
      )
      .first();
    if (existing) {
      const updated: Club = {
        ...existing,
        ...scoped,
        id: existing.id,
        ownerScoutId,
        syncStatus: "pending",
        updatedAt: nowIso(),
        createdAt: existing.createdAt,
      };
      await db.clubs.put(updated);
      return { club: updated, created: false };
    }
  }

  const byName = await db.clubs
    .filter(
      (c) =>
        c.ownerScoutId === ownerScoutId &&
        c.name.toLowerCase() === scoped.name.toLowerCase()
    )
    .first();
  if (byName) {
    const updated: Club = {
      ...byName,
      ...scoped,
      id: byName.id,
      ownerScoutId,
      externalSource: scoped.externalSource ?? byName.externalSource,
      externalRef: scoped.externalRef ?? byName.externalRef,
      syncStatus: "pending",
      updatedAt: nowIso(),
      createdAt: byName.createdAt,
    };
    await db.clubs.put(updated);
    return { club: updated, created: false };
  }

  return { club: await createClub(scoped), created: true };
}

export async function listClubs(): Promise<Club[]> {
  await ensureSeeded();
  const scoutId = await currentScoutId();
  const all = await db.clubs.orderBy("name").toArray();
  return all.filter((c) => !c.ownerScoutId || c.ownerScoutId === scoutId);
}

export async function getClub(id: string): Promise<Club | undefined> {
  const club = await db.clubs.get(id);
  if (!club) return undefined;
  const scoutId = await currentScoutId();
  if (club.ownerScoutId && club.ownerScoutId !== scoutId) return undefined;
  return club;
}

export async function createPlayer(
  input: Omit<Player, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<Player> {
  const now = nowIso();
  const ownerScoutId = input.ownerScoutId ?? (await currentScoutId());
  const player: Player = {
    ...input,
    ownerScoutId,
    id: newId(),
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.players.add(player);
  return player;
}

/** Dedup: gleicher Spieler (Quelle+externe ID) **pro Scout**. */
export async function upsertPlayerByExternalRef(
  input: Omit<Player, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<{ player: Player; created: boolean }> {
  const ownerScoutId = input.ownerScoutId ?? (await currentScoutId());
  const scoped = { ...input, ownerScoutId };

  if (scoped.externalSource && scoped.externalRef) {
    const existing = await db.players
      .filter(
        (p) =>
          p.ownerScoutId === ownerScoutId &&
          p.externalSource === scoped.externalSource &&
          p.externalRef === scoped.externalRef
      )
      .first();
    if (existing) {
      const updated: Player = {
        ...existing,
        ...scoped,
        id: existing.id,
        ownerScoutId,
        syncStatus: "pending",
        updatedAt: nowIso(),
        createdAt: existing.createdAt,
      };
      await db.players.put(updated);
      return { player: updated, created: false };
    }
  }

  return { player: await createPlayer(scoped), created: true };
}

export async function listPlayers(): Promise<Player[]> {
  await ensureSeeded();
  const scoutId = await currentScoutId();
  const all = await db.players.orderBy("nachname").toArray();
  return all.filter((p) => !p.ownerScoutId || p.ownerScoutId === scoutId);
}

export async function getPlayer(id: string): Promise<Player | undefined> {
  const player = await db.players.get(id);
  if (!player) return undefined;
  const scoutId = await currentScoutId();
  if (player.ownerScoutId && player.ownerScoutId !== scoutId) return undefined;
  return player;
}

export async function createMatch(
  input: Omit<Match, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<Match> {
  const now = nowIso();
  const ownerScoutId = input.ownerScoutId ?? (await currentScoutId());
  const match: Match = {
    ...input,
    ownerScoutId,
    phases: input.phases ?? [],
    videoMarkers: input.videoMarkers ?? [],
    id: newId(),
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.matches.add(match);
  return match;
}

export async function getMatch(id: string): Promise<Match | undefined> {
  const match = await db.matches.get(id);
  if (!match) return undefined;
  const scoutId = await currentScoutId();
  if (match.ownerScoutId && match.ownerScoutId !== scoutId) return undefined;
  return match;
}

export async function updateMatch(
  id: string,
  patch: Partial<
    Omit<Match, "id" | "createdAt" | "ownerScoutId" | "syncStatus">
  >
): Promise<Match | undefined> {
  const existing = await getMatch(id);
  if (!existing) return undefined;
  const updated: Match = {
    ...existing,
    ...patch,
    id: existing.id,
    ownerScoutId: existing.ownerScoutId,
    createdAt: existing.createdAt,
    syncStatus: "pending",
    updatedAt: nowIso(),
  };
  await db.matches.put(updated);
  return updated;
}

export async function upsertMatchByExternalRef(
  input: Omit<Match, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<{ match: Match; created: boolean }> {
  const ownerScoutId = input.ownerScoutId ?? (await currentScoutId());
  const scoped = { ...input, ownerScoutId };

  if (scoped.externalSource && scoped.externalRef) {
    const existing = await db.matches
      .filter(
        (m) =>
          m.ownerScoutId === ownerScoutId &&
          m.externalSource === scoped.externalSource &&
          m.externalRef === scoped.externalRef
      )
      .first();
    if (existing) {
      const updated: Match = {
        ...existing,
        ...scoped,
        id: existing.id,
        ownerScoutId,
        syncStatus: "pending",
        updatedAt: nowIso(),
        createdAt: existing.createdAt,
      };
      await db.matches.put(updated);
      return { match: updated, created: false };
    }
  }

  return { match: await createMatch(scoped), created: true };
}

export async function listMatches(): Promise<Match[]> {
  const scoutId = await currentScoutId();
  const all = await db.matches.orderBy("datum").reverse().toArray();
  return all.filter((m) => !m.ownerScoutId || m.ownerScoutId === scoutId);
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
  const scoutId = await currentScoutId();
  const all = await db.playerReports.orderBy("datum").reverse().toArray();
  return all.filter((r) => r.scoutId === scoutId);
}

export async function getPlayerReport(
  id: string
): Promise<PlayerReport | undefined> {
  const report = await db.playerReports.get(id);
  if (!report) return undefined;
  const scoutId = await currentScoutId();
  if (report.scoutId !== scoutId) return undefined;
  return report;
}

export async function updatePlayerReport(
  id: string,
  patch: Partial<
    Omit<PlayerReport, "id" | "createdAt" | "scoutId" | "syncStatus">
  >
): Promise<PlayerReport | undefined> {
  const existing = await getPlayerReport(id);
  if (!existing) return undefined;
  const updated: PlayerReport = {
    ...existing,
    ...patch,
    id: existing.id,
    scoutId: existing.scoutId,
    createdAt: existing.createdAt,
    syncStatus: "pending",
    updatedAt: nowIso(),
  };
  await db.playerReports.put(updated);
  return updated;
}

export async function listPlayerReportsForPlayer(
  playerId: string
): Promise<PlayerReport[]> {
  const scoutId = await currentScoutId();
  const rows = await db.playerReports.where("playerId").equals(playerId).toArray();
  return rows
    .filter((r) => r.scoutId === scoutId)
    .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
}

export async function createTeamReport(
  input: Omit<TeamReport, "id" | "syncStatus" | "updatedAt" | "createdAt">
): Promise<TeamReport> {
  const now = nowIso();
  const report: TeamReport = {
    ...input,
    ratings: input.ratings ?? [],
    id: newId(),
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.teamReports.add(report);
  return report;
}

export async function listTeamReports(): Promise<TeamReport[]> {
  const scoutId = await currentScoutId();
  const all = await db.teamReports.orderBy("datum").reverse().toArray();
  return all.filter((r) => r.scoutId === scoutId);
}

export async function getTeamReport(
  id: string
): Promise<TeamReport | undefined> {
  const report = await db.teamReports.get(id);
  if (!report) return undefined;
  const scoutId = await currentScoutId();
  if (report.scoutId !== scoutId) return undefined;
  return report;
}

export async function updateTeamReport(
  id: string,
  patch: Partial<
    Omit<TeamReport, "id" | "createdAt" | "scoutId" | "syncStatus">
  >
): Promise<TeamReport | undefined> {
  const existing = await getTeamReport(id);
  if (!existing) return undefined;
  const updated: TeamReport = {
    ...existing,
    ...patch,
    id: existing.id,
    scoutId: existing.scoutId,
    createdAt: existing.createdAt,
    syncStatus: "pending",
    updatedAt: nowIso(),
  };
  await db.teamReports.put(updated);
  return updated;
}

export interface SyncQueueStats {
  pending: number;
  error: number;
  total: number;
}

export async function getSyncQueueStats(): Promise<SyncQueueStats> {
  const scoutId = await currentScoutId();
  const [
    clubsP,
    clubsE,
    playersP,
    playersE,
    matchesP,
    matchesE,
    prP,
    prE,
    trP,
    trE,
    attrP,
    attrE,
  ] = await Promise.all([
    db.clubs.where("syncStatus").equals("pending").toArray(),
    db.clubs.where("syncStatus").equals("error").toArray(),
    db.players.where("syncStatus").equals("pending").toArray(),
    db.players.where("syncStatus").equals("error").toArray(),
    db.matches.where("syncStatus").equals("pending").toArray(),
    db.matches.where("syncStatus").equals("error").toArray(),
    db.playerReports.where("syncStatus").equals("pending").toArray(),
    db.playerReports.where("syncStatus").equals("error").toArray(),
    db.teamReports.where("syncStatus").equals("pending").toArray(),
    db.teamReports.where("syncStatus").equals("error").toArray(),
    db.attributeDefinitions.where("syncStatus").equals("pending").toArray(),
    db.attributeDefinitions.where("syncStatus").equals("error").toArray(),
  ]);

  const own = <T extends { ownerScoutId?: string; scoutId?: string }>(
    rows: T[],
    kind: "owner" | "scout"
  ) =>
    rows.filter((r) =>
      kind === "owner"
        ? !r.ownerScoutId || r.ownerScoutId === scoutId
        : r.scoutId === scoutId
    ).length;

  const pending =
    own(clubsP, "owner") +
    own(playersP, "owner") +
    own(matchesP, "owner") +
    own(prP, "scout") +
    own(trP, "scout") +
    own(attrP, "owner");
  const error =
    own(clubsE, "owner") +
    own(playersE, "owner") +
    own(matchesE, "owner") +
    own(prE, "scout") +
    own(trE, "scout") +
    own(attrE, "owner");

  return { pending, error, total: pending + error };
}

export async function countPending(): Promise<number> {
  const stats = await getSyncQueueStats();
  return stats.total;
}

/** Setzt alle eigenen Sync-Fehler zurück auf pending (für manuellen Retry). */
export async function resetSyncErrorsToPending(): Promise<number> {
  const scoutId = await currentScoutId();
  let reset = 0;

  const resetTable = async <
    T extends { id: string; syncStatus: string; ownerScoutId?: string; scoutId?: string },
  >(
    rows: T[],
    update: (id: string, changes: Partial<T>) => Promise<number>,
    kind: "owner" | "scout"
  ) => {
    for (const row of rows) {
      const owned =
        kind === "owner"
          ? !row.ownerScoutId || row.ownerScoutId === scoutId
          : row.scoutId === scoutId;
      if (!owned) continue;
      await update(row.id, {
        syncStatus: "pending",
        updatedAt: new Date().toISOString(),
      } as Partial<T>);
      reset += 1;
    }
  };

  const [clubsE, playersE, matchesE, prE, trE, attrE] = await Promise.all([
    db.clubs.where("syncStatus").equals("error").toArray(),
    db.players.where("syncStatus").equals("error").toArray(),
    db.matches.where("syncStatus").equals("error").toArray(),
    db.playerReports.where("syncStatus").equals("error").toArray(),
    db.teamReports.where("syncStatus").equals("error").toArray(),
    db.attributeDefinitions.where("syncStatus").equals("error").toArray(),
  ]);

  await resetTable(clubsE, (id, c) => db.clubs.update(id, c), "owner");
  await resetTable(playersE, (id, c) => db.players.update(id, c), "owner");
  await resetTable(matchesE, (id, c) => db.matches.update(id, c), "owner");
  await resetTable(prE, (id, c) => db.playerReports.update(id, c), "scout");
  await resetTable(trE, (id, c) => db.teamReports.update(id, c), "scout");
  await resetTable(attrE, (id, c) => db.attributeDefinitions.update(id, c), "owner");

  return reset;
}

export async function listAttributeDefinitions(
  giltFuer?: AttributeAppliesTo
): Promise<AttributeDefinition[]> {
  await ensureSeeded();
  const scoutId = await currentScoutId();
  const all = await db.attributeDefinitions.orderBy("reihenfolge").toArray();
  return all.filter((d) => {
    if (giltFuer && d.giltFuer !== giltFuer) return false;
    if (!d.istCustom) return true;
    return !d.ownerScoutId || d.ownerScoutId === scoutId;
  });
}

export async function createCustomAttribute(input: {
  name: string;
  giltFuer?: AttributeAppliesTo;
  gruppe?: string;
  skalaMin?: number;
  skalaMax?: number;
}): Promise<AttributeDefinition> {
  await ensureSeeded();
  const scoutId = await currentScoutId();
  const name = input.name.trim();
  if (!name) throw new Error("Name erforderlich");

  const giltFuer = input.giltFuer ?? "player";
  let key = slugifyAttributeKey(name);
  const existingKeys = new Set(
    (await listAttributeDefinitions(giltFuer)).map((d) => d.key)
  );
  if (existingKeys.has(key)) {
    let n = 2;
    while (existingKeys.has(`${key}_${n}`)) n += 1;
    key = `${key}_${n}`;
  }

  const siblings = await listAttributeDefinitions(giltFuer);
  const maxOrder = siblings.reduce((m, d) => Math.max(m, d.reihenfolge), 0);
  const now = nowIso();
  const def: AttributeDefinition = {
    id: newId(),
    giltFuer,
    key,
    name,
    typ: "skala",
    skalaMin: input.skalaMin ?? 1,
    skalaMax: input.skalaMax ?? 10,
    gruppe: input.gruppe?.trim() || undefined,
    istCustom: true,
    reihenfolge: maxOrder + 1,
    ownerScoutId: scoutId,
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.attributeDefinitions.add(def);
  return def;
}

export async function updateCustomAttribute(
  id: string,
  patch: Partial<Pick<AttributeDefinition, "name" | "gruppe" | "skalaMin" | "skalaMax" | "reihenfolge">>
): Promise<AttributeDefinition | undefined> {
  const existing = await db.attributeDefinitions.get(id);
  if (!existing || !existing.istCustom) return undefined;
  const scoutId = await currentScoutId();
  if (existing.ownerScoutId && existing.ownerScoutId !== scoutId) return undefined;

  const updated: AttributeDefinition = {
    ...existing,
    ...patch,
    name: patch.name?.trim() || existing.name,
    gruppe: patch.gruppe !== undefined ? patch.gruppe.trim() || undefined : existing.gruppe,
    syncStatus: "pending",
    updatedAt: nowIso(),
  };
  await db.attributeDefinitions.put(updated);
  return updated;
}

export async function deleteCustomAttribute(id: string): Promise<boolean> {
  const existing = await db.attributeDefinitions.get(id);
  if (!existing || !existing.istCustom) return false;
  const scoutId = await currentScoutId();
  if (existing.ownerScoutId && existing.ownerScoutId !== scoutId) return false;
  await db.attributeDefinitions.delete(id);
  return true;
}

/**
 * Entfernt lokale Datensätze anderer Scouts (nach Login/Sync).
 * Orphans ohne ownerScoutId, die zu eigenen Berichten gehören, werden
 * dem aktuellen Scout zugeordnet; sonst gelöscht.
 */
export async function purgeForeignLocalData(scoutId: string): Promise<{
  removed: number;
  claimed: number;
}> {
  let removed = 0;
  let claimed = 0;

  const myPlayerIds = new Set(
    (await db.playerReports.where("scoutId").equals(scoutId).toArray()).map(
      (r) => r.playerId
    )
  );
  const myClubIds = new Set(
    (await db.teamReports.where("scoutId").equals(scoutId).toArray()).map(
      (r) => r.clubId
    )
  );

  for (const r of await db.playerReports.toArray()) {
    if (r.scoutId !== scoutId) {
      await db.playerReports.delete(r.id);
      removed += 1;
    }
  }
  for (const r of await db.teamReports.toArray()) {
    if (r.scoutId !== scoutId) {
      await db.teamReports.delete(r.id);
      removed += 1;
    }
  }

  for (const p of await db.players.toArray()) {
    if (p.ownerScoutId && p.ownerScoutId !== scoutId) {
      await db.players.delete(p.id);
      removed += 1;
      continue;
    }
    if (!p.ownerScoutId) {
      if (myPlayerIds.has(p.id)) {
        await db.players.update(p.id, {
          ownerScoutId: scoutId,
          syncStatus: "pending",
          updatedAt: nowIso(),
        });
        claimed += 1;
      } else {
        await db.players.delete(p.id);
        removed += 1;
      }
    }
  }

  for (const c of await db.clubs.toArray()) {
    if (c.ownerScoutId && c.ownerScoutId !== scoutId) {
      await db.clubs.delete(c.id);
      removed += 1;
      continue;
    }
    if (!c.ownerScoutId) {
      if (myClubIds.has(c.id)) {
        await db.clubs.update(c.id, {
          ownerScoutId: scoutId,
          syncStatus: "pending",
          updatedAt: nowIso(),
        });
        claimed += 1;
      } else {
        // Club behalten, wenn ein eigener Spieler ihn referenziert
        const used = await db.players
          .filter(
            (p) =>
              p.ownerScoutId === scoutId && p.aktuellerClubId === c.id
          )
          .first();
        if (used) {
          await db.clubs.update(c.id, {
            ownerScoutId: scoutId,
            syncStatus: "pending",
            updatedAt: nowIso(),
          });
          claimed += 1;
        } else {
          await db.clubs.delete(c.id);
          removed += 1;
        }
      }
    }
  }

  for (const m of await db.matches.toArray()) {
    if (m.ownerScoutId && m.ownerScoutId !== scoutId) {
      await db.matches.delete(m.id);
      removed += 1;
      continue;
    }
    if (!m.ownerScoutId) {
      const usedInReport =
        (await db.playerReports
          .where("scoutId")
          .equals(scoutId)
          .filter((r) => r.matchId === m.id)
          .first()) ||
        (await db.teamReports
          .where("scoutId")
          .equals(scoutId)
          .filter((r) => r.matchId === m.id)
          .first());
      if (usedInReport) {
        await db.matches.update(m.id, {
          ownerScoutId: scoutId,
          syncStatus: "pending",
          updatedAt: nowIso(),
        });
        claimed += 1;
      } else {
        await db.matches.delete(m.id);
        removed += 1;
      }
    }
  }

  for (const a of await db.attributeDefinitions.toArray()) {
    if (!a.istCustom) continue;
    if (a.ownerScoutId && a.ownerScoutId !== scoutId) {
      await db.attributeDefinitions.delete(a.id);
      removed += 1;
    }
  }

  return { removed, claimed };
}
