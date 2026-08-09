import { getSupabaseClient, isSupabaseConfigured } from "../supabase/client";
import { getCurrentSession } from "../auth/session";
import { db } from "../local/db";
import { purgeForeignLocalData } from "../local/repository";
import type {
  AttributeDefinition,
  AttributeAppliesTo,
  AttributeType,
  Bezugstyp,
  Berichtsart,
  Club,
  ConsentStatus,
  Empfehlung,
  FormationPlayerPos,
  FormationSequenceStep,
  GameParticipation,
  Match,
  ParticipationRole,
  Player,
  PlayerBlindPreview,
  PlayerLink,
  PlayerLinkStatus,
  PlayerReport,
  PlayerShare,
  ShareRole,
  ShareStatus,
  SquadMembership,
  SyncStatus,
  TacticalFormation,
  Team,
  TeamReport,
} from "../types";
import { parsePhasesFromRemote } from "../match/formations";
import { parseVideoMarkersFromRemote } from "../match/video";
import { saveLocalProfileOverlay } from "../trainer/mode";
import { parseJahrgang } from "../trainer/jahrgang";
import type { AppMode, AppRole } from "../types";

export interface SyncResult {
  ok: boolean;
  synced: number;
  pulled: number;
  failed: number;
  message: string;
  /** Kurze Fehlertexte aus Push/Pull (für Retry-UI). */
  errors?: string[];
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
  const errors = [...(push.errors ?? []), ...(pull.errors ?? [])];

  let message: string;
  if (!ok) {
    message = [push.message, pull.message].filter(Boolean).join(" · ");
  } else if (synced === 0 && pulled === 0) {
    message = "Alles aktuell, nichts zu synchronisieren.";
  } else {
    const parts: string[] = [];
    if (synced > 0) parts.push(`${synced} hochgeladen`);
    if (pulled > 0) parts.push(`${pulled} heruntergeladen`);
    message = parts.join(", ") + ".";
  }

  return { ok, synced, pulled, failed, message, errors };
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
        "Supabase ist nicht konfiguriert, Berichte werden nur lokal gespeichert.",
    };
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      ok: false,
      synced: 0,
      pulled: 0,
      failed: 0,
      message: "Keine Internetverbindung, Sync wird übersprungen.",
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
      roles: session.scout.roles ?? ["scout"],
      primary_mode: session.scout.primaryMode ?? null,
      trainer_club_name: session.scout.trainerClubName ?? null,
      trainer_age_groups: session.scout.trainerAgeGroups ?? [],
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
      jahrgang: parseJahrgang(p.jahrgang) ?? null,
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
      formation_heim_off: m.formationHeimOff ?? null,
      formation_heim_def: m.formationHeimDef ?? null,
      formation_gast_off: m.formationGastOff ?? null,
      formation_gast_def: m.formationGastDef ?? null,
      phases: m.phases ?? [],
      video_url: m.videoUrl ?? null,
      video_ref: m.videoRef ?? null,
      video_markers: m.videoMarkers ?? [],
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
    await syncTable<TeamReport>(db.teamReports, "team_reports", (r) => {
      const customFields: Record<string, unknown> = {
        ...(r.customFields ?? {}),
      };
      if (r.ratings && r.ratings.length > 0) {
        customFields.ratings = r.ratings;
      } else {
        delete customFields.ratings;
      }
      return {
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
        custom_fields: customFields,
        updated_at: r.updatedAt,
        created_at: r.createdAt,
      };
    })
  );

  track(await syncCustomAttributes(session.scout.id));

  track(
    await syncTable<Team>(db.teams, "teams", (t) => ({
      id: t.id,
      name: t.name,
      club_id: t.clubId ?? null,
      club_name: t.clubName,
      age_group: t.ageGroup,
      season: t.season ?? null,
      created_by: t.ownerScoutId,
      updated_at: t.updatedAt,
      created_at: t.createdAt,
    }))
  );

  track(
    await syncTable<SquadMembership>(db.squadMemberships, "squad_memberships", (m) => ({
      id: m.id,
      team_id: m.teamId,
      player_id: m.playerId,
      consent_status: m.consentStatus,
      jersey_number: m.jerseyNumber ?? null,
      notes: m.notes ?? null,
      created_by: m.ownerScoutId,
      updated_at: m.updatedAt,
      created_at: m.createdAt,
    }))
  );

  track(
    await syncTable<PlayerShare>(db.playerShares, "player_shares", (s) => ({
      id: s.id,
      player_id: s.playerId,
      created_by: s.ownerScoutId,
      invite_code: s.inviteCode,
      invite_expires_at: s.inviteExpiresAt,
      accepted_by: s.acceptedByScoutId ?? null,
      role: s.role,
      status: s.status,
      share_pii: s.sharePii,
      revoked_at: s.revokedAt ?? null,
      accepted_at: s.acceptedAt ?? null,
      updated_at: s.updatedAt,
      created_at: s.createdAt,
    }))
  );

  track(
    await syncTable<TacticalFormation>(
      db.tacticalFormations,
      "tactical_formations",
      (f) => ({
        id: f.id,
        name: f.name,
        team_id: f.teamId ?? null,
        game_id: f.gameId ?? null,
        template_key: f.templateKey ?? null,
        positions_off: f.positionsOff,
        positions_def: f.positionsDef,
        sequences: f.sequences ?? [],
        created_by: f.ownerScoutId,
        updated_at: f.updatedAt,
        created_at: f.createdAt,
      })
    )
  );

  track(
    await syncTable<PlayerLink>(db.playerLinks, "player_links", (l) => ({
      id: l.id,
      player_id_a: l.playerIdA,
      owner_a: l.ownerA,
      player_id_b: l.playerIdB,
      owner_b: l.ownerB,
      match_score: l.matchScore,
      status: l.status,
      confirmed_by_a: Boolean(l.confirmedByA),
      confirmed_by_b: Boolean(l.confirmedByB),
      confirmed_at: l.confirmedAt ?? null,
      preview_a: l.previewA,
      preview_b: l.previewB,
      updated_at: l.updatedAt,
      created_at: l.createdAt,
    }))
  );

  track(
    await syncTable<GameParticipation>(
      db.gameParticipations,
      "game_participations",
      (p) => ({
        id: p.id,
        game_id: p.gameId,
        team_id: p.teamId ?? null,
        player_id: p.playerId,
        position: p.position ?? null,
        minuten_von: p.minutenVon ?? null,
        minuten_bis: p.minutenBis ?? null,
        rolle: p.rolle,
        created_by: p.ownerScoutId,
        updated_at: p.updatedAt,
        created_at: p.createdAt,
      })
    )
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
      errors: [],
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
    errors,
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
      message: "Keine Internetverbindung, Pull übersprungen.",
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
      jahrgang: parseJahrgang(row.jahrgang),
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
      formationHeimOff: (row.formation_heim_off as string | null) ?? undefined,
      formationHeimDef: (row.formation_heim_def as string | null) ?? undefined,
      formationGastOff: (row.formation_gast_off as string | null) ?? undefined,
      formationGastDef: (row.formation_gast_def as string | null) ?? undefined,
      phases: parsePhasesFromRemote(row.phases),
      videoUrl: (row.video_url as string | null) ?? undefined,
      videoRef: (row.video_ref as string | null) ?? undefined,
      videoMarkers: parseVideoMarkersFromRemote(row.video_markers),
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
    await pullTable<TeamReport>("team_reports", db.teamReports, (row) => {
      const rawCustom =
        (row.custom_fields as Record<string, unknown> | null) ?? {};
      const ratingsRaw = rawCustom.ratings;
      const ratings = Array.isArray(ratingsRaw) ? ratingsRaw : [];
      const { ratings: _drop, ...restCustom } = rawCustom;
      return {
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
        ratings,
        media: [],
        customFields:
          Object.keys(restCustom).length > 0 ? restCustom : undefined,
        syncStatus: "synced",
        updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
        createdAt: iso(row.created_at) ?? new Date().toISOString(),
      };
    })
  );

  track(await pullCustomAttributes(session.scout.id));

  track(
    await pullTable<Team>("teams", db.teams, (row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      clubId: (row.club_id as string | null) ?? undefined,
      clubName: String(row.club_name ?? ""),
      ageGroup: String(row.age_group ?? ""),
      season: (row.season as string | null) ?? undefined,
      ownerScoutId: String(row.created_by ?? session.scout.id),
      syncStatus: "synced",
      updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
    }))
  );

  track(
    await pullTable<SquadMembership>("squad_memberships", db.squadMemberships, (row) => ({
      id: String(row.id),
      teamId: String(row.team_id),
      playerId: String(row.player_id),
      consentStatus: (row.consent_status as ConsentStatus) ?? "ausstehend",
      jerseyNumber: (row.jersey_number as number | null) ?? undefined,
      notes: (row.notes as string | null) ?? undefined,
      ownerScoutId: String(row.created_by ?? session.scout.id),
      syncStatus: "synced",
      updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
    }))
  );

  track(
    await pullTable<PlayerShare>("player_shares", db.playerShares, (row) => ({
      id: String(row.id),
      playerId: String(row.player_id),
      ownerScoutId: String(row.created_by ?? session.scout.id),
      inviteCode: String(row.invite_code ?? ""),
      inviteExpiresAt: iso(row.invite_expires_at) ?? new Date().toISOString(),
      acceptedByScoutId: (row.accepted_by as string | null) ?? undefined,
      role: (row.role as ShareRole) ?? "viewer",
      status: (row.status as ShareStatus) ?? "pending",
      sharePii: Boolean(row.share_pii),
      revokedAt: iso(row.revoked_at) ?? undefined,
      acceptedAt: iso(row.accepted_at) ?? undefined,
      syncStatus: "synced",
      updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
    }))
  );

  track(
    await pullTable<TacticalFormation>(
      "tactical_formations",
      db.tacticalFormations,
      (row) => ({
        id: String(row.id),
        name: String(row.name ?? ""),
        teamId: (row.team_id as string | null) ?? undefined,
        gameId: (row.game_id as string | null) ?? undefined,
        templateKey: (row.template_key as string | null) ?? undefined,
        positionsOff: Array.isArray(row.positions_off)
          ? (row.positions_off as FormationPlayerPos[])
          : [],
        positionsDef: Array.isArray(row.positions_def)
          ? (row.positions_def as FormationPlayerPos[])
          : [],
        sequences: Array.isArray(row.sequences)
          ? (row.sequences as FormationSequenceStep[])
          : [],
        ownerScoutId: String(row.created_by ?? session.scout.id),
        syncStatus: "synced",
        updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
        createdAt: iso(row.created_at) ?? new Date().toISOString(),
      })
    )
  );

  track(
    await pullTable<PlayerLink>("player_links", db.playerLinks, (row) => ({
      id: String(row.id),
      playerIdA: String(row.player_id_a),
      ownerA: String(row.owner_a),
      playerIdB: String(row.player_id_b),
      ownerB: String(row.owner_b),
      matchScore: Number(row.match_score ?? 0),
      status: (row.status as PlayerLinkStatus) ?? "vorgeschlagen",
      confirmedByA: Boolean(row.confirmed_by_a),
      confirmedByB: Boolean(row.confirmed_by_b),
      confirmedAt: iso(row.confirmed_at) ?? undefined,
      previewA: (row.preview_a as PlayerBlindPreview) ?? { positionen: [] },
      previewB: (row.preview_b as PlayerBlindPreview) ?? { positionen: [] },
      syncStatus: "synced",
      updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
    }))
  );

  track(
    await pullTable<GameParticipation>(
      "game_participations",
      db.gameParticipations,
      (row) => ({
        id: String(row.id),
        gameId: String(row.game_id),
        teamId: (row.team_id as string | null) ?? undefined,
        playerId: String(row.player_id),
        position: (row.position as string | null) ?? undefined,
        minutenVon: (row.minuten_von as number | null) ?? undefined,
        minutenBis: (row.minuten_bis as number | null) ?? undefined,
        rolle: (row.rolle as ParticipationRole) ?? "startxi",
        ownerScoutId: String(row.created_by ?? session.scout.id),
        syncStatus: "synced",
        updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
        createdAt: iso(row.created_at) ?? new Date().toISOString(),
      })
    )
  );

  // Scout-Profil (Rollen) vom Server in Overlay spiegeln
  try {
    const { data: scoutRow } = await supabase
      .from("scouts")
      .select(
        "roles, primary_mode, trainer_club_name, trainer_age_groups, name"
      )
      .eq("id", session.scout.id)
      .maybeSingle();
    if (scoutRow) {
      saveLocalProfileOverlay({
        name: (scoutRow.name as string | undefined) ?? session.scout.name,
        roles: Array.isArray(scoutRow.roles)
          ? (scoutRow.roles as AppRole[])
          : ["scout"],
        primaryMode: (scoutRow.primary_mode as AppMode | null) ?? undefined,
        trainerClubName:
          (scoutRow.trainer_club_name as string | null) ?? undefined,
        trainerAgeGroups: Array.isArray(scoutRow.trainer_age_groups)
          ? (scoutRow.trainer_age_groups as string[])
          : undefined,
      });
    }
  } catch {
    // Profil-Pull optional
  }

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
      errors: [],
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
    errors,
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

async function syncCustomAttributes(
  scoutId: string
): Promise<{ synced: number; failed: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { synced: 0, failed: 0 };

  const pending = (await db.attributeDefinitions.toArray()).filter(
    (a) =>
      a.istCustom &&
      (a.syncStatus === "pending" || a.syncStatus === "error") &&
      (!a.ownerScoutId || a.ownerScoutId === scoutId)
  );
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  let firstError: string | undefined;

  for (const a of pending) {
    const { error } = await supabase.from("attribute_definitions").upsert(
      {
        id: a.id,
        gilt_fuer: a.giltFuer,
        key: a.key,
        name: a.name,
        typ: a.typ,
        skala_min: a.skalaMin ?? null,
        skala_max: a.skalaMax ?? null,
        auswahl_optionen: a.auswahlOptionen ?? null,
        gruppe: a.gruppe ?? null,
        ist_custom: true,
        reihenfolge: a.reihenfolge,
        created_by: a.ownerScoutId ?? scoutId,
        created_at: a.createdAt ?? new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) {
      failed += 1;
      if (!firstError) firstError = `attribute_definitions: ${error.message}`;
      await db.attributeDefinitions.update(a.id, { syncStatus: "error" });
      continue;
    }
    await db.attributeDefinitions.update(a.id, { syncStatus: "synced" });
    synced += 1;
  }

  return { synced, failed, error: firstError };
}

async function pullCustomAttributes(
  scoutId: string
): Promise<{ pulled: number; failed: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { pulled: 0, failed: 0 };

  const { data, error } = await supabase
    .from("attribute_definitions")
    .select("*")
    .eq("ist_custom", true)
    .eq("created_by", scoutId);

  if (error) {
    return {
      pulled: 0,
      failed: 1,
      error: `attribute_definitions: ${error.message}`,
    };
  }

  let pulled = 0;
  for (const row of data ?? []) {
    const id = String(row.id);
    const local = await db.attributeDefinitions.get(id);
    if (local && (local.syncStatus === "pending" || local.syncStatus === "error")) {
      continue;
    }
    const mapped: AttributeDefinition = {
      id,
      giltFuer: row.gilt_fuer as AttributeAppliesTo,
      key: String(row.key),
      name: String(row.name),
      typ: row.typ as AttributeType,
      skalaMin: (row.skala_min as number | null) ?? undefined,
      skalaMax: (row.skala_max as number | null) ?? undefined,
      auswahlOptionen: Array.isArray(row.auswahl_optionen)
        ? (row.auswahl_optionen as string[])
        : undefined,
      gruppe: (row.gruppe as string | null) ?? undefined,
      istCustom: true,
      reihenfolge: Number(row.reihenfolge ?? 100),
      ownerScoutId: (row.created_by as string | null) ?? scoutId,
      syncStatus: "synced",
      updatedAt: iso(row.created_at) ?? new Date().toISOString(),
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
    };
    await db.attributeDefinitions.put(mapped);
    pulled += 1;
  }

  return { pulled, failed: 0 };
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
