/**
 * Leichter HTML-Scraper für fussball.de (Amateur-/Jugendbereich).
 * Nutzt die öffentlichen Ajax-Endpoints der Website (kein api-fussball.de-Token nötig).
 *
 * Hinweis: Jugend-Kader sind oft nicht zur Veröffentlichung freigegeben.
 * In dem Fall liefert der Scraper Mannschaften, aber keine Spieler.
 */
import type { ImportedClub, ImportedPlayer, ImportSearchResult } from "./types";
import {
  decodeObfuscatedHtml,
  fussballUserAgent,
} from "./fussballDeObfuscation";
import { extractFussballDeId } from "./fussballDe";

const SOURCE = "fussball.de";
const BASE = "https://www.fussball.de";

/** Aktuelle und letzte Saisons (YYZZ), neueste zuerst. */
const DEFAULT_SEASONS = ["2526", "2425", "2324", "2223", "2122"];

export interface ScrapedTeam {
  teamId: string;
  name: string;
  category?: string;
  season?: string;
}

export interface SquadImportResult extends ImportSearchResult {
  teams: ScrapedTeam[];
  seasonUsed?: string;
  notice?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(pathOrUrl: string, referer?: string): Promise<string> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE}${pathOrUrl}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": fussballUserAgent(),
      Accept: "text/html, */*; q=0.01",
      "Accept-Language": "de-DE,de;q=0.9",
      "X-Requested-With": "XMLHttpRequest",
      Referer: referer ?? `${BASE}/`,
    },
  });
  if (!res.ok) {
    throw new Error(`fussball.de antwortete mit HTTP ${res.status} (${url}).`);
  }
  return res.text();
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractClubId(input: string): string | null {
  const trimmed = input.trim();
  const fromUrl =
    trimmed.match(/\/(?:verein|club)\/[^"]*?\/id\/([A-Z0-9]{10,})/i)?.[1] ??
    trimmed.match(/[/-]id\/([A-Z0-9]{10,})/i)?.[1];
  if (fromUrl && !/team-id/i.test(trimmed.slice(0, trimmed.indexOf(fromUrl)))) {
    // Prefer explicit club id from verein URLs; extractFussballDeId also works.
  }
  if (/\/verein\//i.test(trimmed) || /club-id\//i.test(trimmed)) {
    return (
      trimmed.match(/club-id\/([A-Z0-9]{10,})/i)?.[1]?.toUpperCase() ??
      trimmed.match(/\/id\/([A-Z0-9]{10,})/i)?.[1]?.toUpperCase() ??
      null
    );
  }
  if (/^[A-Z0-9]{20,}$/i.test(trimmed) && !/team-id/i.test(trimmed)) {
    // Ambiguous raw ID – treat as club if caller says so.
    return trimmed.toUpperCase();
  }
  return extractFussballDeId(trimmed);
}

export function extractTeamId(input: string): string | null {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/team-id\/([A-Z0-9]{10,})/i)?.[1];
  if (fromUrl) return fromUrl.toUpperCase();
  if (/mannschaft/i.test(trimmed)) {
    return extractFussballDeId(trimmed);
  }
  return null;
}

function splitPlayerName(full: string): { vorname: string; nachname: string } {
  const cleaned = full.replace(/\s+/g, " ").trim();
  if (!cleaned || /^k\.?\s*a\.?$/i.test(cleaned)) {
    return { vorname: "", nachname: "" };
  }
  if (cleaned.includes(",")) {
    const [nach, ...rest] = cleaned.split(",");
    return {
      nachname: (nach ?? "").trim(),
      vorname: rest.join(",").trim(),
    };
  }
  const parts = cleaned.split(" ");
  if (parts.length === 1) return { vorname: "", nachname: parts[0] ?? "" };
  return {
    vorname: parts.slice(0, -1).join(" "),
    nachname: parts[parts.length - 1] ?? "",
  };
}

function parseTeamItems(html: string, season?: string): ScrapedTeam[] {
  const teams: ScrapedTeam[] = [];
  const seen = new Set<string>();
  const re =
    /<h4>\s*<a[^>]+href="[^"]*?team-id\/([A-Z0-9]+)"[^>]*>\s*([\s\S]*?)<\/a>\s*<\/h4>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const teamId = match[1]!.toUpperCase();
    if (seen.has(teamId)) continue;
    seen.add(teamId);
    const label = stripTags(match[2]!);
    const category = label.includes(" - ")
      ? label.split(" - ")[0]?.trim()
      : undefined;
    teams.push({
      teamId,
      name: label,
      category,
      season,
    });
  }
  return teams;
}

/**
 * Lädt Mannschaften eines Vereins (inkl. Jugend) für eine Saison.
 */
export async function scrapeClubTeams(
  clubIdOrUrl: string,
  season = "2526"
): Promise<{ club: ImportedClub; teams: ScrapedTeam[] }> {
  const clubId =
    extractClubId(clubIdOrUrl) ?? extractFussballDeId(clubIdOrUrl);
  if (!clubId) {
    throw new Error(
      "Keine Vereins-ID erkannt. Bitte Vereins-URL mit /-/id/… einfügen."
    );
  }

  const html = await fetchHtml(
    `/ajax.club.teams/-/action/search/id/${clubId}?saison=${season}`,
    `${BASE}/verein/-/id/${clubId}`
  );
  const teams = parseTeamItems(html, season);

  // Clubname aus erstem Team-Label ableiten, sonst ID.
  let clubName = `Verein ${clubId.slice(0, 8)}`;
  const first = teams[0]?.name;
  if (first) {
    const withoutCat = first.includes(" - ")
      ? first.split(" - ").slice(1).join(" - ").trim()
      : first;
    clubName = withoutCat.replace(/\s+(I{1,3}|C\d|D\d|B\d|A\d)$/i, "").trim() || withoutCat;
  }

  // Versuch, sauberen Namen von der Vereinsseite zu holen.
  try {
    await sleep(250);
    const page = await fetchHtml(`/verein/-/id/${clubId}`);
    const title =
      page.match(/<title>([^|<]+)/i)?.[1]?.trim() ??
      page.match(/class="headline"[^>]*>\s*([^<]+)/i)?.[1]?.trim();
    if (title && !/fussball\.de/i.test(title)) {
      clubName = title.replace(/\s*[-|].*$/, "").trim() || clubName;
    }
  } catch {
    // optional
  }

  return {
    club: {
      externalSource: SOURCE,
      externalRef: clubId,
      name: clubName,
      land: "Deutschland",
      logoUrl: `https://www.fussball.de/export.media/-/action/getLogo/format/0/id/${clubId}`,
    },
    teams,
  };
}

interface RawSquadPlayer {
  playerId: string;
  nameHtml: string;
  fontId: string;
}

function parseSquadPlayers(html: string): {
  players: RawSquadPlayer[];
  lockedMessage?: string;
} {
  const locked =
    html.match(/class="headline">\s*([^<]*nicht[^<]*freigegeben[^<]*)/i)?.[1] ??
    html.match(/class="headline">\s*([^<]*nicht[^<]*veröffentlicht[^<]*)/i)?.[1];
  if (locked) {
    return { players: [], lockedMessage: stripTags(locked) };
  }

  const players: RawSquadPlayer[] = [];
  const seen = new Set<string>();
  const re =
    /player-id\/([A-Z0-9]+)[^"]*"[^>]*>[\s\S]*?data-obfuscation="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const playerId = match[1]!.toUpperCase();
    if (seen.has(playerId)) continue;
    seen.add(playerId);
    players.push({
      playerId,
      fontId: match[2]!,
      nameHtml: match[3]!,
    });
  }
  return { players };
}

async function decodePlayers(
  raw: RawSquadPlayer[],
  club: ImportedClub,
  teamName?: string
): Promise<ImportedPlayer[]> {
  const out: ImportedPlayer[] = [];
  for (const p of raw) {
    const full = (await decodeObfuscatedHtml(p.nameHtml, p.fontId)).trim();
    const { vorname, nachname } = splitPlayerName(full);
    if (!vorname && !nachname) continue;
    out.push({
      externalSource: SOURCE,
      externalRef: p.playerId,
      vorname: vorname || "—",
      nachname: nachname || full,
      positionen: [],
      clubExternalRef: club.externalRef,
      clubName: teamName ? `${club.name} (${teamName})` : club.name,
      nationalitaet: "Deutschland",
    });
  }
  return out;
}

/**
 * Lädt den Kader einer Mannschaft. Probiert mehrere Saisons, bis Spieler
 * gefunden werden oder alle als „nicht freigegeben“ gelten.
 */
export async function scrapeTeamSquad(
  teamIdOrUrl: string,
  options?: {
    clubId?: string;
    clubName?: string;
    seasons?: string[];
    teamName?: string;
  }
): Promise<SquadImportResult> {
  const teamId = extractTeamId(teamIdOrUrl) ?? extractFussballDeId(teamIdOrUrl);
  if (!teamId) {
    throw new Error(
      "Keine Mannschafts-ID erkannt. Bitte Mannschafts-URL mit team-id/… einfügen."
    );
  }

  const seasons = options?.seasons ?? DEFAULT_SEASONS;
  let club: ImportedClub = {
    externalSource: SOURCE,
    externalRef: options?.clubId ?? `team-club:${teamId}`,
    name: options?.clubName ?? options?.teamName ?? `Mannschaft ${teamId.slice(0, 8)}`,
    land: "Deutschland",
  };

  // Club-ID von Mannschaftsseite nachziehen, wenn möglich.
  if (!options?.clubId) {
    try {
      const page = await fetchHtml(
        `/mannschaft/-/saison/${seasons[0]}/team-id/${teamId}`
      );
      const clubFromPage = page.match(
        /\/verein\/([^"/]+)\/-\/id\/([A-Z0-9]{10,})/i
      );
      const teamTitle =
        page.match(/<title>([^|<]+)/i)?.[1]?.trim() ?? options?.teamName;
      if (clubFromPage) {
        const clubId = clubFromPage[2]!.toUpperCase();
        const slugName = clubFromPage[1]!
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        club = {
          ...club,
          externalRef: clubId,
          name: options?.clubName ?? slugName,
          logoUrl: `https://www.fussball.de/export.media/-/action/getLogo/format/0/id/${clubId}`,
        };
      }
      if (teamTitle) {
        options = {
          ...options,
          teamName: teamTitle.replace(/\s*[-|].*$/, "").trim(),
        };
      }
      await sleep(250);
    } catch {
      // optional
    }
  }

  let lastLock: string | undefined;
  for (const season of seasons) {
    const html = await fetchHtml(
      `/ajax.team.squad/-/mode/PAGE/order-by/2/saison/${season}/show-filter/true/team-id/${teamId}`,
      `${BASE}/mannschaft/-/saison/${season}/team-id/${teamId}`
    );
    const parsed = parseSquadPlayers(html);
    if (parsed.lockedMessage) {
      lastLock = parsed.lockedMessage;
      await sleep(300);
      continue;
    }
    if (parsed.players.length === 0) {
      await sleep(300);
      continue;
    }

    const players = await decodePlayers(
      parsed.players,
      club,
      options?.teamName
    );
    return {
      clubs: [club],
      players,
      matches: [],
      teams: [
        {
          teamId,
          name: options?.teamName ?? club.name,
          season,
        },
      ],
      seasonUsed: season,
      notice:
        season !== seasons[0]
          ? `Aktuelle Saison ohne öffentlichen Kader – Spieler aus Saison ${season.slice(0, 2)}/${season.slice(2)} übernommen.`
          : undefined,
    };
  }

  return {
    clubs: [club],
    players: [],
    matches: [],
    teams: [{ teamId, name: options?.teamName ?? club.name }],
    notice:
      lastLock ??
      "Für diese Mannschaft ist kein öffentlicher Kader verfügbar (bei Jugendteams häufig der Fall).",
  };
}

/**
 * Club-URL → Mannschaften laden; optional Kader einer/aller Jugendmannschaften.
 */
export async function scrapeClubWithOptionalSquads(
  clubIdOrUrl: string,
  options?: {
    season?: string;
    teamId?: string;
    /** Wenn true, versucht Kader für alle gelisteten Teams (rate-limited). */
    importAllSquads?: boolean;
  }
): Promise<SquadImportResult> {
  const season = options?.season ?? "2526";
  const { club, teams } = await scrapeClubTeams(clubIdOrUrl, season);

  if (options?.teamId) {
    await sleep(300);
    const squad = await scrapeTeamSquad(options.teamId, {
      clubId: club.externalRef,
      clubName: club.name,
      teamName: teams.find((t) => t.teamId === options.teamId)?.name,
    });
    return {
      ...squad,
      clubs: [club],
      teams,
    };
  }

  if (options?.importAllSquads && teams.length > 0) {
    const allPlayers: ImportedPlayer[] = [];
    const notices: string[] = [];
    let seasonUsed: string | undefined;
    for (const team of teams) {
      await sleep(400);
      const squad = await scrapeTeamSquad(team.teamId, {
        clubId: club.externalRef,
        clubName: club.name,
        teamName: team.name,
      });
      allPlayers.push(...squad.players);
      if (squad.seasonUsed) seasonUsed = squad.seasonUsed;
      if (squad.notice && squad.players.length === 0) {
        notices.push(`${team.name}: ${squad.notice}`);
      }
    }
    // Dedup players by externalRef
    const deduped = new Map<string, ImportedPlayer>();
    for (const p of allPlayers) deduped.set(p.externalRef, p);

    return {
      clubs: [club],
      players: [...deduped.values()],
      matches: [],
      teams,
      seasonUsed,
      notice:
        deduped.size === 0
          ? notices.slice(0, 3).join(" ") ||
            "Keine öffentlichen Kaderlisten gefunden. Jugendspieler oft nicht freigegeben – bitte manuell oder per Namensliste anlegen."
          : `${deduped.size} Spieler aus veröffentlichten Kadern. ${
              notices.length
                ? `(${notices.length} Mannschaft(en) ohne Kader.)`
                : ""
            }`,
    };
  }

  return {
    clubs: [club],
    players: [],
    matches: [],
    teams,
    notice:
      teams.length > 0
        ? `${teams.length} Mannschaft(en) gefunden. Wähle eine Mannschaft, um den Kader zu laden.`
        : "Keine Mannschaften für diese Saison gefunden. Andere Saison versuchen.",
  };
}

/**
 * Erkennt automatisch Verein- vs. Mannschafts-URL.
 */
export async function scrapeFussballDe(
  urlOrId: string,
  options?: { season?: string; importAllSquads?: boolean }
): Promise<SquadImportResult> {
  const input = urlOrId.trim();
  const teamId = extractTeamId(input);
  const isClubUrl = /\/verein\//i.test(input) || /club-id\//i.test(input);

  if (teamId && !isClubUrl) {
    return scrapeTeamSquad(input);
  }

  if (isClubUrl || extractClubId(input)) {
    return scrapeClubWithOptionalSquads(input, {
      season: options?.season,
      importAllSquads: options?.importAllSquads,
    });
  }

  // Rohe ID: zuerst als Team versuchen, sonst Club.
  if (/^[A-Z0-9]{20,}$/i.test(input)) {
    try {
      const asTeam = await scrapeTeamSquad(input);
      if (asTeam.players.length > 0 || !asTeam.notice?.includes("keine")) {
        return asTeam;
      }
    } catch {
      // fall through
    }
    return scrapeClubWithOptionalSquads(input, {
      season: options?.season,
      importAllSquads: options?.importAllSquads,
    });
  }

  throw new Error(
    "URL nicht erkannt. Bitte Vereins-URL (/verein/…/id/…) oder Mannschafts-URL (…/team-id/…) einfügen."
  );
}
