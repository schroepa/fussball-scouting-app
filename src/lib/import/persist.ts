import {
  upsertClubByExternalRef,
  upsertMatchByExternalRef,
  upsertPlayerByExternalRef,
} from "../local/repository";
import type {
  ImportedClub,
  ImportedMatch,
  ImportedPlayer,
  ImportSearchResult,
} from "./types";

export interface PersistResult {
  clubsCreated: number;
  clubsUpdated: number;
  playersCreated: number;
  playersUpdated: number;
  matchesCreated: number;
  matchesUpdated: number;
  clubIds: string[];
  playerIds: string[];
}

/**
 * Schreibt Import-Ergebnisse lokal (Dexie) mit Deduplizierung.
 * Beim nächsten Sync landen die Stammdaten + später die Scout-Bewertungen
 * in Supabase.
 */
export async function persistImportResult(
  result: ImportSearchResult
): Promise<PersistResult> {
  const out: PersistResult = {
    clubsCreated: 0,
    clubsUpdated: 0,
    playersCreated: 0,
    playersUpdated: 0,
    matchesCreated: 0,
    matchesUpdated: 0,
    clubIds: [],
    playerIds: [],
  };

  const clubIdByExternal = new Map<string, string>();

  for (const club of result.clubs) {
    const saved = await persistClub(club);
    clubIdByExternal.set(
      `${club.externalSource}:${club.externalRef}`,
      saved.club.id
    );
    out.clubIds.push(saved.club.id);
    if (saved.created) out.clubsCreated += 1;
    else out.clubsUpdated += 1;
  }

  for (const player of result.players) {
    let clubId: string | undefined;
    if (player.clubExternalRef) {
      const key = `${player.externalSource}:${player.clubExternalRef}`;
      clubId = clubIdByExternal.get(key);
      if (!clubId && player.clubName) {
        const club = await persistClub({
          externalSource: player.externalSource,
          externalRef: player.clubExternalRef,
          name: player.clubName,
          land: "Deutschland",
        });
        clubId = club.club.id;
        clubIdByExternal.set(key, clubId);
        out.clubIds.push(clubId);
        if (club.created) out.clubsCreated += 1;
        else out.clubsUpdated += 1;
      }
    } else if (player.clubName) {
      const club = await persistClub({
        externalSource: player.externalSource,
        externalRef: `name:${player.clubName.toLowerCase()}`,
        name: player.clubName,
        land: "Deutschland",
      });
      clubId = club.club.id;
      out.clubIds.push(clubId);
      if (club.created) out.clubsCreated += 1;
      else out.clubsUpdated += 1;
    }

    const saved = await upsertPlayerByExternalRef({
      vorname: player.vorname,
      nachname: player.nachname,
      geburtsdatum: player.geburtsdatum,
      nationalitaet: player.nationalitaet,
      positionen: player.positionen,
      fotoUrl: player.fotoUrl,
      aktuellerClubId: clubId,
      externalSource: player.externalSource,
      externalRef: player.externalRef,
    });
    out.playerIds.push(saved.player.id);
    if (saved.created) out.playersCreated += 1;
    else out.playersUpdated += 1;
  }

  for (const match of result.matches) {
    const saved = await persistMatch(match);
    if (saved.created) out.matchesCreated += 1;
    else out.matchesUpdated += 1;
  }

  return out;
}

async function persistClub(club: ImportedClub) {
  return upsertClubByExternalRef({
    name: club.name,
    land: club.land,
    liga: club.liga,
    logoUrl: club.logoUrl,
    externalSource: club.externalSource,
    externalRef: club.externalRef,
  });
}

async function persistMatch(match: ImportedMatch) {
  return upsertMatchByExternalRef({
    heimClubName: match.heimClubName,
    gastClubName: match.gastClubName,
    wettbewerb: match.wettbewerb,
    datum: match.datum,
    spielort: match.spielort,
    externalSource: match.externalSource,
    externalRef: match.externalRef,
  });
}

export async function persistSinglePlayer(player: ImportedPlayer) {
  return persistImportResult({ clubs: [], players: [player], matches: [] });
}

export async function persistSingleClub(club: ImportedClub) {
  return persistImportResult({ clubs: [club], players: [], matches: [] });
}
