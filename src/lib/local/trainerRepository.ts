/**
 * Trainer-Repository: Teams, Kader, Freigaben, Aufstellungen.
 * Getrennt von den Scout-Kernfunktionen in repository.ts.
 */
import { db, ensureSeeded } from "./db";
import { getCurrentSession } from "../auth/session";
import { generateInviteCode } from "../trainer/mode";
import {
  defensiveFromOffensive,
  emptyPositionsFromTemplate,
} from "../trainer/formationBoard";
import { buildBlindPreview } from "../trainer/matching";
import type {
  ConsentStatus,
  GameParticipation,
  ParticipationRole,
  Player,
  PlayerLink,
  PlayerShare,
  ShareRole,
  SquadMembership,
  TacticalFormation,
  Team,
} from "../types";
import { newId } from "./repository";

function nowIso(): string {
  return new Date().toISOString();
}

async function currentScoutId(): Promise<string> {
  const session = await getCurrentSession();
  return session.scout.id;
}

export async function createTeam(
  input: Omit<Team, "id" | "syncStatus" | "updatedAt" | "createdAt" | "ownerScoutId"> & {
    ownerScoutId?: string;
  }
): Promise<Team> {
  const now = nowIso();
  const ownerScoutId = input.ownerScoutId ?? (await currentScoutId());
  const team: Team = {
    ...input,
    ownerScoutId,
    id: newId(),
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.teams.add(team);
  return team;
}

export async function listTeams(): Promise<Team[]> {
  await ensureSeeded();
  const scoutId = await currentScoutId();
  const all = await db.teams.orderBy("name").toArray();
  return all.filter((t) => t.ownerScoutId === scoutId);
}

export async function getTeam(id: string): Promise<Team | undefined> {
  const team = await db.teams.get(id);
  if (!team) return undefined;
  const scoutId = await currentScoutId();
  if (team.ownerScoutId !== scoutId) return undefined;
  return team;
}

export async function updateTeam(
  id: string,
  patch: Partial<Omit<Team, "id" | "createdAt" | "ownerScoutId">>
): Promise<Team | undefined> {
  const existing = await getTeam(id);
  if (!existing) return undefined;
  const updated: Team = {
    ...existing,
    ...patch,
    id: existing.id,
    ownerScoutId: existing.ownerScoutId,
    createdAt: existing.createdAt,
    syncStatus: "pending",
    updatedAt: nowIso(),
  };
  await db.teams.put(updated);
  return updated;
}

export async function deleteTeam(id: string): Promise<boolean> {
  const existing = await getTeam(id);
  if (!existing) return false;
  await db.squadMemberships.where("teamId").equals(id).delete();
  await db.tacticalFormations.where("teamId").equals(id).delete();
  await db.teams.delete(id);
  return true;
}

export async function addSquadMember(input: {
  teamId: string;
  playerId: string;
  consentStatus?: ConsentStatus;
  jerseyNumber?: number;
  notes?: string;
}): Promise<SquadMembership> {
  const scoutId = await currentScoutId();
  const existing = await db.squadMemberships
    .filter((m) => m.teamId === input.teamId && m.playerId === input.playerId)
    .first();
  if (existing) {
    if (existing.ownerScoutId !== scoutId) {
      throw new Error("Kein Zugriff auf diesen Kadereintrag.");
    }
    return existing;
  }
  const now = nowIso();
  const row: SquadMembership = {
    id: newId(),
    teamId: input.teamId,
    playerId: input.playerId,
    consentStatus: input.consentStatus ?? "ausstehend",
    jerseyNumber: input.jerseyNumber,
    notes: input.notes,
    ownerScoutId: scoutId,
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.squadMemberships.add(row);
  return row;
}

export async function listSquadMemberships(
  teamId?: string
): Promise<SquadMembership[]> {
  const scoutId = await currentScoutId();
  let rows = await db.squadMemberships.toArray();
  rows = rows.filter((m) => m.ownerScoutId === scoutId);
  if (teamId) rows = rows.filter((m) => m.teamId === teamId);
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function updateSquadMembership(
  id: string,
  patch: Partial<
    Pick<SquadMembership, "consentStatus" | "jerseyNumber" | "notes">
  >
): Promise<SquadMembership | undefined> {
  const existing = await db.squadMemberships.get(id);
  if (!existing) return undefined;
  const scoutId = await currentScoutId();
  if (existing.ownerScoutId !== scoutId) return undefined;

  const updated: SquadMembership = {
    ...existing,
    ...patch,
    syncStatus: "pending",
    updatedAt: nowIso(),
  };
  await db.squadMemberships.put(updated);

  // Einwilligung verweigert → aktive Freigaben dieses Spielers widerrufen
  if (patch.consentStatus === "verweigert") {
    await revokeSharesForPlayer(existing.playerId);
  }

  return updated;
}

export async function removeSquadMember(id: string): Promise<boolean> {
  const existing = await db.squadMemberships.get(id);
  if (!existing) return false;
  const scoutId = await currentScoutId();
  if (existing.ownerScoutId !== scoutId) return false;
  await db.squadMemberships.delete(id);
  return true;
}

export async function listSquadPlayers(teamId: string): Promise<
  Array<{ membership: SquadMembership; player: Player }>
> {
  const memberships = await listSquadMemberships(teamId);
  const result: Array<{ membership: SquadMembership; player: Player }> = [];
  for (const membership of memberships) {
    const player = await db.players.get(membership.playerId);
    if (player) result.push({ membership, player });
  }
  return result.sort((a, b) => {
    const ya = a.player.jahrgang ?? 9999;
    const yb = b.player.jahrgang ?? 9999;
    if (ya !== yb) return ya - yb;
    return a.player.nachname.localeCompare(b.player.nachname, "de");
  });
}

async function revokeSharesForPlayer(playerId: string): Promise<void> {
  const scoutId = await currentScoutId();
  const now = nowIso();
  const shares = await db.playerShares
    .filter(
      (s) =>
        s.playerId === playerId &&
        s.ownerScoutId === scoutId &&
        (s.status === "active" || s.status === "pending")
    )
    .toArray();
  for (const share of shares) {
    await db.playerShares.put({
      ...share,
      status: "revoked",
      revokedAt: now,
      syncStatus: "pending",
      updatedAt: now,
    });
  }
}

export async function createPlayerShare(input: {
  playerId: string;
  role: ShareRole;
  sharePii?: boolean;
  /** Gültigkeit in Tagen, Standard 14. */
  expiresInDays?: number;
}): Promise<PlayerShare> {
  const scoutId = await currentScoutId();
  const memberships = await db.squadMemberships
    .filter((m) => m.playerId === input.playerId && m.ownerScoutId === scoutId)
    .toArray();
  const consentOk =
    memberships.length === 0 ||
    memberships.some((m) => m.consentStatus === "erteilt");
  if (!consentOk) {
    throw new Error(
      "Freigabe nur bei erteilter Einwilligung möglich (Jugendschutz)."
    );
  }

  const days = input.expiresInDays ?? 14;
  const now = new Date();
  const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const share: PlayerShare = {
    id: newId(),
    playerId: input.playerId,
    ownerScoutId: scoutId,
    inviteCode: generateInviteCode(),
    inviteExpiresAt: expires.toISOString(),
    role: input.role,
    status: "pending",
    sharePii: input.sharePii ?? false,
    syncStatus: "pending",
    updatedAt: now.toISOString(),
    createdAt: now.toISOString(),
  };
  await db.playerShares.add(share);
  return share;
}

export async function listOutgoingShares(): Promise<PlayerShare[]> {
  const scoutId = await currentScoutId();
  return (await db.playerShares.toArray())
    .filter((s) => s.ownerScoutId === scoutId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listIncomingShares(): Promise<PlayerShare[]> {
  const scoutId = await currentScoutId();
  return (await db.playerShares.toArray())
    .filter(
      (s) =>
        s.acceptedByScoutId === scoutId &&
        (s.status === "active" || s.status === "revoked")
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function acceptShareByCode(code: string): Promise<PlayerShare> {
  const scoutId = await currentScoutId();
  const normalized = code.trim().toUpperCase();

  let share = await db.playerShares
    .filter((s) => s.inviteCode.toUpperCase() === normalized)
    .first();

  // Remote-Lookup, falls Code lokal noch nicht bekannt (Einladung von anderem Gerät)
  if (!share) {
    const { getSupabaseClient, isSupabaseConfigured } = await import(
      "../supabase/client"
    );
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from("player_shares")
          .select("*")
          .eq("invite_code", normalized)
          .maybeSingle();
        if (data) {
          share = {
            id: String(data.id),
            playerId: String(data.player_id),
            ownerScoutId: String(data.created_by),
            inviteCode: String(data.invite_code),
            inviteExpiresAt: String(data.invite_expires_at),
            acceptedByScoutId: (data.accepted_by as string | null) ?? undefined,
            role: (data.role as ShareRole) ?? "viewer",
            status: (data.status as PlayerShare["status"]) ?? "pending",
            sharePii: Boolean(data.share_pii),
            revokedAt: (data.revoked_at as string | null) ?? undefined,
            acceptedAt: (data.accepted_at as string | null) ?? undefined,
            syncStatus: "synced",
            updatedAt: String(data.updated_at ?? new Date().toISOString()),
            createdAt: String(data.created_at ?? new Date().toISOString()),
          };
          await db.playerShares.put(share);
        }
      }
    }
  }

  if (!share) {
    throw new Error("Einladungscode nicht gefunden.");
  }
  if (share.ownerScoutId === scoutId) {
    throw new Error("Eigene Freigabe kann nicht angenommen werden.");
  }
  if (share.status === "revoked") {
    throw new Error("Diese Freigabe wurde widerrufen.");
  }
  if (share.status === "expired" || new Date(share.inviteExpiresAt) < new Date()) {
    await db.playerShares.put({
      ...share,
      status: "expired",
      syncStatus: "pending",
      updatedAt: nowIso(),
    });
    throw new Error("Einladung ist abgelaufen.");
  }
  if (share.status === "active" && share.acceptedByScoutId === scoutId) {
    return share;
  }
  if (share.status === "active") {
    throw new Error("Einladung wurde bereits von jemand anderem angenommen.");
  }

  const updated: PlayerShare = {
    ...share,
    status: "active",
    acceptedByScoutId: scoutId,
    acceptedAt: nowIso(),
    syncStatus: "pending",
    updatedAt: nowIso(),
  };
  await db.playerShares.put(updated);
  return updated;
}

export async function revokeShare(id: string): Promise<PlayerShare | undefined> {
  const share = await db.playerShares.get(id);
  if (!share) return undefined;
  const scoutId = await currentScoutId();
  if (share.ownerScoutId !== scoutId) return undefined;
  const updated: PlayerShare = {
    ...share,
    status: "revoked",
    revokedAt: nowIso(),
    syncStatus: "pending",
    updatedAt: nowIso(),
  };
  await db.playerShares.put(updated);
  return updated;
}

export async function createTacticalFormation(input: {
  name: string;
  teamId?: string;
  templateKey?: string;
  gameId?: string;
}): Promise<TacticalFormation> {
  const scoutId = await currentScoutId();
  const templateKey = input.templateKey ?? "4-3-3";
  const positionsOff = emptyPositionsFromTemplate(templateKey);
  const now = nowIso();
  const formation: TacticalFormation = {
    id: newId(),
    name: input.name,
    teamId: input.teamId,
    gameId: input.gameId,
    templateKey,
    positionsOff,
    positionsDef: defensiveFromOffensive(positionsOff),
    sequences: [{ id: newId(), label: "Schritt 1", movements: [] }],
    ownerScoutId: scoutId,
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.tacticalFormations.add(formation);
  return formation;
}

export async function listTacticalFormations(
  teamId?: string
): Promise<TacticalFormation[]> {
  const scoutId = await currentScoutId();
  let rows = await db.tacticalFormations.toArray();
  rows = rows.filter((f) => f.ownerScoutId === scoutId);
  if (teamId) rows = rows.filter((f) => f.teamId === teamId);
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getTacticalFormation(
  id: string
): Promise<TacticalFormation | undefined> {
  const row = await db.tacticalFormations.get(id);
  if (!row) return undefined;
  const scoutId = await currentScoutId();
  if (row.ownerScoutId !== scoutId) return undefined;
  return row;
}

export async function updateTacticalFormation(
  id: string,
  patch: Partial<
    Pick<
      TacticalFormation,
      | "name"
      | "teamId"
      | "gameId"
      | "templateKey"
      | "positionsOff"
      | "positionsDef"
      | "sequences"
    >
  >
): Promise<TacticalFormation | undefined> {
  const existing = await getTacticalFormation(id);
  if (!existing) return undefined;
  const updated: TacticalFormation = {
    ...existing,
    ...patch,
    syncStatus: "pending",
    updatedAt: nowIso(),
  };
  await db.tacticalFormations.put(updated);
  return updated;
}

export async function deleteTacticalFormation(id: string): Promise<boolean> {
  const existing = await getTacticalFormation(id);
  if (!existing) return false;
  await db.tacticalFormations.delete(id);
  return true;
}

export async function duplicateTacticalFormation(
  id: string
): Promise<TacticalFormation | undefined> {
  const existing = await getTacticalFormation(id);
  if (!existing) return undefined;
  return createTacticalFormation({
    name: `${existing.name} (Kopie)`,
    teamId: existing.teamId,
    templateKey: existing.templateKey,
  }).then(async (created) => {
    return (
      (await updateTacticalFormation(created.id, {
        positionsOff: existing.positionsOff,
        positionsDef: existing.positionsDef,
        sequences: existing.sequences,
      })) ?? created
    );
  });
}

/** Entwicklung: Berichte eines Spielers chronologisch. */
export async function getPlayerDevelopment(playerId: string) {
  const reports = await db.playerReports
    .where("playerId")
    .equals(playerId)
    .toArray();
  return reports.sort((a, b) => a.datum.localeCompare(b.datum));
}

export async function proposePlayerLink(input: {
  myPlayer: Player;
  otherPlayer: Player;
  score: number;
  clubNameMine?: string;
  clubNameOther?: string;
}): Promise<PlayerLink> {
  const scoutId = await currentScoutId();
  const otherOwner = input.otherPlayer.ownerScoutId ?? scoutId;
  const now = nowIso();

  // Bestehende Verknüpfung derselben Paarung wiederverwenden
  const existing = (await db.playerLinks.toArray()).find(
    (l) =>
      (l.playerIdA === input.myPlayer.id && l.playerIdB === input.otherPlayer.id) ||
      (l.playerIdB === input.myPlayer.id && l.playerIdA === input.otherPlayer.id)
  );
  if (existing) return existing;

  const iAmA = true;
  const link: PlayerLink = {
    id: newId(),
    playerIdA: input.myPlayer.id,
    ownerA: scoutId,
    playerIdB: input.otherPlayer.id,
    ownerB: otherOwner,
    matchScore: input.score,
    status: "vorgeschlagen",
    confirmedByA: iAmA,
    confirmedByB: otherOwner === scoutId, // lokaler Doppelgänger: sofort beide Seiten
    previewA: buildBlindPreview(input.myPlayer, input.clubNameMine),
    previewB: buildBlindPreview(input.otherPlayer, input.clubNameOther),
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };

  if (link.confirmedByA && link.confirmedByB) {
    link.status = "bestaetigt";
    link.confirmedAt = now;
  }

  await db.playerLinks.add(link);

  if (link.status === "bestaetigt" && otherOwner !== scoutId) {
    await ensureLinkShares(link);
  }

  return link;
}

async function ensureLinkShares(link: PlayerLink): Promise<void> {
  // Automatische Contributor-Freigaben in beide Richtungen (ohne PII)
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const now = nowIso();
  const shares: PlayerShare[] = [
    {
      id: newId(),
      playerId: link.playerIdA,
      ownerScoutId: link.ownerA,
      inviteCode: generateInviteCode(),
      inviteExpiresAt: expires,
      acceptedByScoutId: link.ownerB,
      role: "contributor",
      status: "active",
      sharePii: false,
      acceptedAt: now,
      syncStatus: "pending",
      updatedAt: now,
      createdAt: now,
    },
    {
      id: newId(),
      playerId: link.playerIdB,
      ownerScoutId: link.ownerB,
      inviteCode: generateInviteCode(),
      inviteExpiresAt: expires,
      acceptedByScoutId: link.ownerA,
      role: "contributor",
      status: "active",
      sharePii: false,
      acceptedAt: now,
      syncStatus: "pending",
      updatedAt: now,
      createdAt: now,
    },
  ];
  for (const s of shares) {
    await db.playerShares.put(s);
  }
}

export async function listPlayerLinks(): Promise<PlayerLink[]> {
  const scoutId = await currentScoutId();
  return (await db.playerLinks.toArray())
    .filter((l) => l.ownerA === scoutId || l.ownerB === scoutId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function confirmPlayerLink(id: string): Promise<PlayerLink | undefined> {
  const link = await db.playerLinks.get(id);
  if (!link) return undefined;
  const scoutId = await currentScoutId();
  if (link.ownerA !== scoutId && link.ownerB !== scoutId) return undefined;

  const updated: PlayerLink = {
    ...link,
    confirmedByA: link.ownerA === scoutId ? true : link.confirmedByA,
    confirmedByB: link.ownerB === scoutId ? true : link.confirmedByB,
    syncStatus: "pending",
    updatedAt: nowIso(),
  };
  if (updated.confirmedByA && updated.confirmedByB) {
    updated.status = "bestaetigt";
    updated.confirmedAt = nowIso();
    await ensureLinkShares(updated);
  }
  await db.playerLinks.put(updated);
  return updated;
}

export async function rejectPlayerLink(id: string): Promise<PlayerLink | undefined> {
  const link = await db.playerLinks.get(id);
  if (!link) return undefined;
  const scoutId = await currentScoutId();
  if (link.ownerA !== scoutId && link.ownerB !== scoutId) return undefined;
  const updated: PlayerLink = {
    ...link,
    status: "abgelehnt",
    syncStatus: "pending",
    updatedAt: nowIso(),
  };
  await db.playerLinks.put(updated);
  return updated;
}

export async function upsertGameParticipation(input: {
  gameId: string;
  playerId: string;
  teamId?: string;
  position?: string;
  minutenVon?: number;
  minutenBis?: number;
  rolle: ParticipationRole;
}): Promise<GameParticipation> {
  const scoutId = await currentScoutId();
  const existing = (await db.gameParticipations.toArray()).find(
    (p) =>
      p.gameId === input.gameId &&
      p.playerId === input.playerId &&
      p.ownerScoutId === scoutId
  );
  const now = nowIso();
  if (existing) {
    const updated: GameParticipation = {
      ...existing,
      ...input,
      syncStatus: "pending",
      updatedAt: now,
    };
    await db.gameParticipations.put(updated);
    return updated;
  }
  const row: GameParticipation = {
    id: newId(),
    ...input,
    ownerScoutId: scoutId,
    syncStatus: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await db.gameParticipations.add(row);
  return row;
}

export async function listGameParticipations(
  gameId?: string
): Promise<GameParticipation[]> {
  const scoutId = await currentScoutId();
  let rows = await db.gameParticipations.toArray();
  rows = rows.filter((p) => p.ownerScoutId === scoutId);
  if (gameId) rows = rows.filter((p) => p.gameId === gameId);
  return rows.sort((a, b) => a.playerId.localeCompare(b.playerId));
}

export async function deleteGameParticipation(id: string): Promise<boolean> {
  const row = await db.gameParticipations.get(id);
  if (!row) return false;
  const scoutId = await currentScoutId();
  if (row.ownerScoutId !== scoutId) return false;
  await db.gameParticipations.delete(id);
  return true;
}

/** Aggregat für Entwicklungsansicht: Positionen über Spiele. */
export async function summarizeParticipationsForPlayer(playerId: string) {
  const scoutId = await currentScoutId();
  const rows = (await db.gameParticipations.toArray()).filter(
    (p) => p.ownerScoutId === scoutId && p.playerId === playerId
  );
  const byPosition = new Map<string, number>();
  for (const r of rows) {
    const key = r.position?.trim() || "ohne Position";
    byPosition.set(key, (byPosition.get(key) ?? 0) + 1);
  }
  return {
    games: rows.length,
    byPosition: [...byPosition.entries()]
      .map(([position, count]) => ({ position, count }))
      .sort((a, b) => b.count - a.count),
  };
}
