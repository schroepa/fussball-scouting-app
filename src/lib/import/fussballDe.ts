import type { ImportedClub, ImportedMatch, ImportSearchResult } from "./types";

const SOURCE = "fussball.de";
const BASE = "https://api-fussball.de/api";

/**
 * Extrahiert die fussball.de-ID aus einer URL oder akzeptiert die ID direkt.
 * Beispiel-URL: https://www.fussball.de/verein/.../-/id/00ES8GN8N400008VVV0AG08LVUPGND5I
 */
export function extractFussballDeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fromUrl =
    trimmed.match(/[/-]id\/([A-Z0-9]{10,})/i)?.[1] ??
    trimmed.match(/team-id\/([A-Z0-9]{10,})/i)?.[1] ??
    trimmed.match(/\/([A-Z0-9]{20,})\s*$/i)?.[1];

  if (fromUrl) return fromUrl.toUpperCase();
  if (/^[A-Z0-9]{10,}$/i.test(trimmed)) return trimmed.toUpperCase();
  return null;
}

async function fussballFetch(path: string): Promise<unknown> {
  const token = import.meta.env.API_FUSSBALL_TOKEN as string | undefined;
  if (!token) {
    throw new Error(
      "API_FUSSBALL_TOKEN fehlt. Token unter https://api-fussball.de anlegen und in .env eintragen."
    );
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-auth-token": token },
  });

  if (!res.ok) {
    throw new Error(
      `fussball.de-API antwortete mit HTTP ${res.status}. ${
        res.status === 502
          ? "Der Dienst ist derzeit nicht erreichbar – bitte später erneut versuchen."
          : "Bitte Token und ID prüfen."
      }`
    );
  }

  return res.json();
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["teams", "data", "items", "club", "response"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  return value ? [value] : [];
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Importiert einen Verein inkl. Mannschaften und (wenn verfügbar) Spielen
 * über api-fussball.de. Spieler-Kader liefert diese API nicht.
 */
export async function importFussballDeClub(
  clubIdOrUrl: string
): Promise<ImportSearchResult> {
  const clubId = extractFussballDeId(clubIdOrUrl);
  if (!clubId) {
    throw new Error(
      "Keine gültige fussball.de-ID erkannt. Bitte Vereins-URL oder ID einfügen."
    );
  }

  let info: unknown;
  try {
    info = await fussballFetch(`/club/info/${clubId}`);
  } catch {
    info = await fussballFetch(`/club/${clubId}`);
  }

  const teams = asArray(info).filter(
    (t) => t && typeof t === "object"
  ) as Array<Record<string, unknown>>;

  // Manche Responses wrappen den Club separat.
  const root = (info && typeof info === "object" ? info : {}) as Record<
    string,
    unknown
  >;
  const clubName =
    pickString(root, ["name", "clubName", "verein"]) ??
    pickString(teams[0] ?? {}, ["clubName", "club_name", "verein"]) ??
    `Verein ${clubId.slice(0, 8)}`;

  const logoUrl =
    pickString(root, ["logoUrl", "logo", "logo_url"]) ??
    pickString(teams[0] ?? {}, ["logoUrl", "logo", "logo_url"]);

  const clubs: ImportedClub[] = [
    {
      externalSource: SOURCE,
      externalRef: clubId,
      name: clubName,
      land: "Deutschland",
      liga: pickString(root, ["liga", "league", "competition"]),
      logoUrl,
    },
  ];

  // Mannschaftsnamen als zusätzliche "Clubs"/Labels speichern wir nicht doppelt –
  // aber Spiele aus next/prev laden.
  const matches: ImportedMatch[] = [];
  for (const endpoint of [
    `/club/next_games/${clubId}`,
    `/club/prev_games/${clubId}`,
  ]) {
    try {
      const gamesRaw = await fussballFetch(endpoint);
      const games = asArray(gamesRaw).filter(
        (g) => g && typeof g === "object"
      ) as Array<Record<string, unknown>>;

      for (const g of games.slice(0, 30)) {
        const home =
          (g.homeSide as Record<string, unknown> | undefined) ??
          (g.home as Record<string, unknown> | undefined) ??
          {};
        const away =
          (g.awaySide as Record<string, unknown> | undefined) ??
          (g.away as Record<string, unknown> | undefined) ??
          {};

        const heimName =
          pickString(home, ["name", "teamName"]) ??
          pickString(g, ["homeName", "heim"]) ??
          "Heim";
        const gastName =
          pickString(away, ["name", "teamName"]) ??
          pickString(g, ["awayName", "gast"]) ??
          "Gast";
        const gameId =
          pickString(g, ["id", "matchId", "gameId"]) ??
          `${heimName}-${gastName}-${pickString(g, ["kickOff", "date", "datum"]) ?? matches.length}`;

        const datumRaw =
          pickString(g, ["kickOff", "date", "datum", "kickoff"]) ??
          new Date().toISOString();
        const datum = new Date(datumRaw).toISOString();

        matches.push({
          externalSource: SOURCE,
          externalRef: gameId,
          heimClubName: heimName,
          gastClubName: gastName,
          heimClubExternalRef: pickString(home, ["clubId", "id"]),
          gastClubExternalRef: pickString(away, ["clubId", "id"]),
          wettbewerb: pickString(g, ["competition", "league", "wettbewerb", "ageGroup"]),
          datum,
          spielort: pickString(g, ["address", "stadium", "spielort", "location"]),
        });
      }
    } catch {
      // Spiele optional – Club-Import soll auch ohne Games klappen.
    }
  }

  return { clubs, players: [], matches };
}
