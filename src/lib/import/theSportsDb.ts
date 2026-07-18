import type { ImportedClub, ImportedPlayer, ImportSearchResult } from "./types";

const SOURCE = "thesportsdb";
const BASE = "https://www.thesportsdb.com/api/v1/json";

function apiKey(): string {
  return (
    (import.meta.env.THESPORTSDB_API_KEY as string | undefined) ||
    (import.meta.env.PUBLIC_THESPORTSDB_API_KEY as string | undefined) ||
    "123"
  );
}

function splitName(full: string): { vorname: string; nachname: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { vorname: parts[0], nachname: "" };
  return {
    vorname: parts.slice(0, -1).join(" "),
    nachname: parts[parts.length - 1] ?? "",
  };
}

/**
 * TheSportsDB: kostenlose Spieler-/Team-Suche (Hobby-Key "123").
 * Gut für bekannte Spieler; deutsche Kreis-/Jugendligen sind dort kaum abgedeckt.
 */
export async function searchTheSportsDb(
  query: string
): Promise<ImportSearchResult> {
  const q = query.trim();
  if (q.length < 2) {
    return { clubs: [], players: [], matches: [] };
  }

  const key = apiKey();
  const [playersRes, teamsRes] = await Promise.all([
    fetch(`${BASE}/${key}/searchplayers.php?p=${encodeURIComponent(q)}`),
    fetch(`${BASE}/${key}/searchteams.php?t=${encodeURIComponent(q)}`),
  ]);

  const playersJson = (await playersRes.json()) as {
    player?: Array<Record<string, string | null>> | null;
  };
  const teamsJson = (await teamsRes.json()) as {
    teams?: Array<Record<string, string | null>> | null;
  };

  const players: ImportedPlayer[] = (playersJson.player ?? [])
    .filter((p) => (p.strSport ?? "").toLowerCase() === "soccer")
    .slice(0, 20)
    .map((p) => {
      const { vorname, nachname } = splitName(p.strPlayer ?? "Unbekannt");
      const position = p.strPosition?.trim();
      return {
        externalSource: SOURCE,
        externalRef: String(p.idPlayer),
        vorname,
        nachname: nachname || vorname,
        geburtsdatum: p.dateBorn ?? undefined,
        nationalitaet: p.strNationality ?? undefined,
        positionen: position ? [position] : [],
        fotoUrl: p.strThumb || p.strCutout || undefined,
        clubExternalRef: p.idTeam ?? undefined,
        clubName: p.strTeam ?? undefined,
      };
    });

  const clubs: ImportedClub[] = (teamsJson.teams ?? [])
    .filter((t) => (t.strSport ?? "").toLowerCase() === "soccer")
    .filter((t) => {
      const country = (t.strCountry ?? "").toLowerCase();
      // Vorerst Deutschland-Fokus; später erweiterbar.
      return !country || country.includes("germany") || country.includes("deutschland");
    })
    .slice(0, 20)
    .map((t) => ({
      externalSource: SOURCE,
      externalRef: String(t.idTeam),
      name: t.strTeam ?? "Unbekannter Verein",
      land: t.strCountry ?? "Deutschland",
      liga: t.strLeague ?? undefined,
      logoUrl: t.strBadge || t.strLogo || undefined,
    }));

  return { clubs, players, matches: [] };
}
