/**
 * Generische Import-Adapter-Schnittstelle (siehe docs/PLANNING.md, M2).
 * Pro Datenquelle ein Provider – so lassen sich später ausländische Ligen
 * ergänzen, ohne den Kern der App zu ändern.
 */

export type ImportEntityKind = "club" | "player" | "match";

export interface ImportedClub {
  externalSource: string;
  externalRef: string;
  name: string;
  land: string;
  liga?: string;
  logoUrl?: string;
}

export interface ImportedPlayer {
  externalSource: string;
  externalRef: string;
  vorname: string;
  nachname: string;
  geburtsdatum?: string;
  nationalitaet?: string;
  positionen: string[];
  fotoUrl?: string;
  clubExternalRef?: string;
  clubName?: string;
}

export interface ImportedMatch {
  externalSource: string;
  externalRef: string;
  heimClubName: string;
  gastClubName: string;
  heimClubExternalRef?: string;
  gastClubExternalRef?: string;
  wettbewerb?: string;
  datum: string;
  spielort?: string;
}

export interface ImportSearchResult {
  clubs: ImportedClub[];
  players: ImportedPlayer[];
  matches: ImportedMatch[];
}
