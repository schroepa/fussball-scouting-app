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
import type {
  ConsentStatus,
  Player,
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
