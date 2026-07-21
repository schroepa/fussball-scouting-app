import type {
  AttributeDefinition,
  Club,
  Empfehlung,
  Player,
  PlayerReport,
  TeamReport,
} from "../types";
import { DEFAULT_PLAYER_ATTRIBUTES } from "../attributeDefinitions";

/** Fallback, wenn noch keine Dexie-Attribute geladen wurden. */
export const RATING_KEYS = DEFAULT_PLAYER_ATTRIBUTES.map((a) => a.key);

export function attributeKeys(defs: AttributeDefinition[]): string[] {
  return defs.map((a) => a.key);
}

export function attributeLabels(
  defs: AttributeDefinition[]
): { key: string; label: string }[] {
  return defs.map((a) => ({ key: a.key, label: a.name }));
}

export type AgeBucket = "u18" | "19_23" | "24_29" | "30plus" | "unbekannt";

export const AGE_BUCKET_LABELS: Record<AgeBucket, string> = {
  u18: "≤ 18",
  "19_23": "19–23",
  "24_29": "24–29",
  "30plus": "30+",
  unbekannt: "Alter unbekannt",
};

export interface PlayerDashboardRow {
  player: Player;
  clubName?: string;
  liga?: string;
  age?: number;
  ageBucket: AgeBucket;
  reportCount: number;
  latest?: PlayerReport;
  latestGesamt?: number;
  latestEmpfehlung?: Empfehlung;
  avgByKey: Record<string, number | undefined>;
  avgGesamt?: number;
}

export function ageFromGeburtsdatum(
  geburtsdatum: string | undefined,
  now = new Date()
): number | undefined {
  if (!geburtsdatum) return undefined;
  const dob = new Date(geburtsdatum);
  if (Number.isNaN(dob.getTime())) return undefined;
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 && age < 80 ? age : undefined;
}

export function ageBucket(age: number | undefined): AgeBucket {
  if (age == null) return "unbekannt";
  if (age <= 18) return "u18";
  if (age <= 23) return "19_23";
  if (age <= 29) return "24_29";
  return "30plus";
}

export function ratingMap(report: PlayerReport): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of report.ratings) {
    map[r.attributeKey] = r.value;
  }
  return map;
}

export function averageRatings(
  reports: PlayerReport[],
  keys: string[] = RATING_KEYS
): Record<string, number | undefined> {
  const sums: Record<string, { sum: number; n: number }> = {};
  for (const key of keys) sums[key] = { sum: 0, n: 0 };

  for (const report of reports) {
    const map = ratingMap(report);
    for (const key of keys) {
      const v = map[key];
      if (typeof v === "number") {
        sums[key]!.sum += v;
        sums[key]!.n += 1;
      }
    }
  }

  const out: Record<string, number | undefined> = {};
  for (const key of keys) {
    const { sum, n } = sums[key]!;
    out[key] = n > 0 ? Math.round((sum / n) * 10) / 10 : undefined;
  }
  return out;
}

export function averageGesamt(reports: PlayerReport[]): number | undefined {
  const values = reports
    .map((r) => r.gesamtbewertung)
    .filter((v): v is number => typeof v === "number");
  if (values.length === 0) return undefined;
  return (
    Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
  );
}

export function buildPlayerDashboardRows(
  players: Player[],
  reports: PlayerReport[],
  clubs: Club[],
  ratingKeys: string[] = RATING_KEYS
): PlayerDashboardRow[] {
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  const reportsByPlayer = new Map<string, PlayerReport[]>();
  for (const r of reports) {
    const list = reportsByPlayer.get(r.playerId) ?? [];
    list.push(r);
    reportsByPlayer.set(r.playerId, list);
  }

  return players.map((player) => {
    const playerReports = (reportsByPlayer.get(player.id) ?? []).sort(
      (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()
    );
    const latest = playerReports[0];
    const club = player.aktuellerClubId
      ? clubById.get(player.aktuellerClubId)
      : undefined;
    const age = ageFromGeburtsdatum(player.geburtsdatum);
    return {
      player,
      clubName: club?.name,
      liga: club?.liga,
      age,
      ageBucket: ageBucket(age),
      reportCount: playerReports.length,
      latest,
      latestGesamt: latest?.gesamtbewertung,
      latestEmpfehlung: latest?.empfehlung,
      avgByKey: averageRatings(playerReports, ratingKeys),
      avgGesamt: averageGesamt(playerReports),
    };
  });
}

export interface TeamDashboardRow {
  club: Club;
  reportCount: number;
  latest?: TeamReport;
  gegnerCount: number;
  eigenCount: number;
  lastFormation?: string;
}

export function buildTeamDashboardRows(
  clubs: Club[],
  reports: TeamReport[]
): TeamDashboardRow[] {
  const byClub = new Map<string, TeamReport[]>();
  for (const r of reports) {
    const list = byClub.get(r.clubId) ?? [];
    list.push(r);
    byClub.set(r.clubId, list);
  }

  const rows: TeamDashboardRow[] = [];
  for (const club of clubs) {
    const clubReports = (byClub.get(club.id) ?? []).sort(
      (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()
    );
    if (clubReports.length === 0) continue;
    const latest = clubReports[0];
    rows.push({
      club,
      reportCount: clubReports.length,
      latest,
      gegnerCount: clubReports.filter((r) => r.berichtsart === "gegner_analyse")
        .length,
      eigenCount: clubReports.filter((r) => r.berichtsart === "eigenes_team")
        .length,
      lastFormation: latest?.formation,
    });
  }

  for (const [clubId, clubReports] of byClub) {
    if (clubs.some((c) => c.id === clubId)) continue;
    const sorted = [...clubReports].sort(
      (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()
    );
    const latest = sorted[0];
    rows.push({
      club: {
        id: clubId,
        name: "Unbekannter Verein",
        land: "Deutschland",
        syncStatus: "synced",
        updatedAt: latest?.updatedAt ?? new Date().toISOString(),
        createdAt: latest?.createdAt ?? new Date().toISOString(),
      },
      reportCount: sorted.length,
      latest,
      gegnerCount: sorted.filter((r) => r.berichtsart === "gegner_analyse")
        .length,
      eigenCount: sorted.filter((r) => r.berichtsart === "eigenes_team").length,
      lastFormation: latest?.formation,
    });
  }

  return rows.sort((a, b) => b.reportCount - a.reportCount);
}

export function radarDataFromAverages(
  avgByKey: Record<string, number | undefined>,
  defs: AttributeDefinition[] = DEFAULT_PLAYER_ATTRIBUTES
): { key: string; label: string; value: number }[] {
  return defs.map((a) => ({
    key: a.key,
    label: a.name,
    value: avgByKey[a.key] ?? 0,
  }));
}
