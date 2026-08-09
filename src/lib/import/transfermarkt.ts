/**
 * Leichter Transfermarkt-Scraper für Vereins-/Jugendkader.
 * Beispiel: https://www.transfermarkt.de/bfc-dynamo-u17/startseite/verein/35633
 *
 * Hinweis: SportDB.dev (https://sportdb.dev) ist ein API-Proxy auf Transfermarkt
 * und Flashscore, benötigt aber einen API-Key. Dieser Scraper holt die Kader
 * direkt und kostenlos von der öffentlichen Vereinsseite.
 */
import type { ImportedClub, ImportedPlayer, ImportSearchResult } from "./types";

const SOURCE = "transfermarkt";
const BASE = "https://www.transfermarkt.de";

export interface TransfermarktImportResult extends ImportSearchResult {
  notice?: string;
}

function userAgent(): string {
  return "FussballScoutingApp/0.1 (+https://github.com/schroepa/fussball-scouting-app; personal scouting import)";
}

export function extractTransfermarktClubId(input: string): string | null {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/\/verein\/(\d+)/i)?.[1];
  if (fromUrl) return fromUrl;
  if (/^\d{2,8}$/.test(trimmed)) return trimmed;
  return null;
}

export function extractTransfermarktSlug(input: string): string | null {
  const m = input.trim().match(/transfermarkt\.[a-z.]+\/([^/?#]+)\/(?:startseite|kader|kader\/detail)\/verein\/\d+/i);
  return m?.[1] ?? null;
}

function germanDateToIso(dmy: string): string | undefined {
  const m = dmy.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return undefined;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function splitName(full: string): { vorname: string; nachname: string } {
  const cleaned = full.replace(/\s+/g, " ").trim();
  const parts = cleaned.split(" ");
  if (parts.length === 1) return { vorname: "", nachname: parts[0] ?? cleaned };
  return {
    vorname: parts.slice(0, -1).join(" "),
    nachname: parts[parts.length - 1] ?? cleaned,
  };
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": userAgent(),
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`Transfermarkt antwortete mit HTTP ${res.status}.`);
  }
  return res.text();
}

function parseClubName(html: string): string {
  const fromHeader = html.match(
    /data-header__headline-wrapper[^>]*>\s*([^<]+)/i
  )?.[1];
  if (fromHeader) return decodeHtml(fromHeader);
  const title = html.match(/<title>\s*([^|<]+)/i)?.[1];
  if (title) {
    return decodeHtml(title.replace(/\s*[--].*$/, "").trim());
  }
  return "Transfermarkt-Verein";
}

function parseLeague(html: string): string | undefined {
  const liga = html.match(
    /data-header__club-info[\s\S]*?<span[^>]*class="data-header__content"[^>]*>\s*<a[^>]*>\s*([^<]+)/i
  )?.[1];
  return liga ? decodeHtml(liga) : undefined;
}

function parseLogo(html: string, clubId: string): string | undefined {
  const logo = html.match(
    /data-header__profile-image[^>]*src="([^"]+)"/i
  )?.[1];
  if (logo) return logo.startsWith("http") ? logo : `https:${logo}`;
  return `https://tmssl.akamaized.net/images/wappen/head/${clubId}.png`;
}

interface RawPlayer {
  id: string;
  name: string;
  position?: string;
  birth?: string;
  nationality?: string;
}

function parsePlayers(html: string): RawPlayer[] {
  const players: RawPlayer[] = [];
  const seen = new Set<string>();

  // Nested inline table: name link + position row, then birth/nationality cells.
  const re =
    /<td class="hauptlink">\s*<a href="\/[^"]*\/profil\/spieler\/(\d+)"\s*>\s*([^<]+?)\s*<\/a>\s*<\/td>\s*<\/tr>\s*<tr>\s*<td>\s*([^<]+?)\s*<\/td>/gi;

  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const id = match[1]!;
    if (seen.has(id)) continue;
    seen.add(id);

    const name = decodeHtml(match[2]!);
    const position = decodeHtml(match[3]!);
    const idIdx = html.indexOf(`profil/spieler/${id}`, match.index);
    const snip = html.slice(
      idIdx >= 0 ? idIdx : match.index,
      (idIdx >= 0 ? idIdx : match.index) + 1800
    );
    const birth =
      snip.match(/(\d{2}\.\d{2}\.\d{4})\s*\((\d+)\)/)?.[1] ??
      snip.match(/(\d{2}\.\d{2}\.\d{4})/)?.[1];
    const nationality = snip.match(
      /title="([^"]+)"[^>]*class="flaggenrahmen"/i
    )?.[1];

    players.push({
      id,
      name,
      position,
      birth,
      nationality: nationality ? decodeHtml(nationality) : undefined,
    });
  }

  // Fallback: plain profile links if nested table markup changes.
  if (players.length === 0) {
    const loose =
      /<a href="\/[^"]*\/profil\/spieler\/(\d+)"[^>]*>\s*([^<]+?)\s*<\/a>/gi;
    while ((match = loose.exec(html))) {
      const id = match[1]!;
      if (seen.has(id)) continue;
      seen.add(id);
      players.push({ id, name: decodeHtml(match[2]!) });
    }
  }

  return players;
}

function buildUrls(clubId: string, slug?: string | null): string[] {
  const s = slug && slug.length > 0 ? slug : "verein";
  // plus/1 und Startseite enthalten Geburtsdaten; reine Kader-Seite oft nur Alter.
  return [
    `${BASE}/${s}/kader/verein/${clubId}/plus/1`,
    `${BASE}/${s}/startseite/verein/${clubId}`,
    `${BASE}/${s}/kader/verein/${clubId}`,
  ];
}

/**
 * Importiert Kader + Vereinsstammdaten von einer Transfermarkt-URL oder Vereins-ID.
 */
export async function importTransfermarktClub(
  urlOrId: string
): Promise<TransfermarktImportResult> {
  const clubId = extractTransfermarktClubId(urlOrId);
  if (!clubId) {
    throw new Error(
      "Keine Transfermarkt-Vereins-ID erkannt. URL wie …/verein/35633 oder die ID einfügen."
    );
  }

  const slug = extractTransfermarktSlug(urlOrId);
  let html = "";
  let players: RawPlayer[] = [];
  for (const url of buildUrls(clubId, slug)) {
    html = await fetchHtml(url);
    players = parsePlayers(html);
    const withBirth = players.filter((p) => p.birth).length;
    if (players.length > 0 && (withBirth > 0 || url.includes("plus/1"))) {
      break;
    }
    if (players.length > 0 && !url.includes("kader/verein")) {
      break;
    }
  }

  const clubName = parseClubName(html);
  const club: ImportedClub = {
    externalSource: SOURCE,
    externalRef: clubId,
    name: clubName,
    land: "Deutschland",
    liga: parseLeague(html),
    logoUrl: parseLogo(html, clubId),
  };

  const importedPlayers: ImportedPlayer[] = players.map((p) => {
    const { vorname, nachname } = splitName(p.name);
    return {
      externalSource: SOURCE,
      externalRef: p.id,
      vorname: vorname || "-",
      nachname: nachname || p.name,
      geburtsdatum: p.birth ? germanDateToIso(p.birth) : undefined,
      nationalitaet: p.nationality,
      positionen: p.position ? [p.position] : [],
      clubExternalRef: clubId,
      clubName,
      fotoUrl: `https://img.a.transfermarkt.technology/portrait/medium/default.jpg`,
    };
  });

  return {
    clubs: [club],
    players: importedPlayers,
    matches: [],
    notice:
      importedPlayers.length > 0
        ? `${importedPlayers.length} Spieler von Transfermarkt geladen (inkl. Jugendkader, sofern gelistet).`
        : "Kein Kader auf der Transfermarkt-Seite gefunden. URL prüfen oder Saison wechseln.",
  };
}
