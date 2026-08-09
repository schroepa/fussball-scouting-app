import type { Club, Player, PlayerBlindPreview } from "../types";

export const MATCH_SCORE_THRESHOLD = 55;

/** Levenshtein-Distanz für fuzzy Namen. */
export function levenshtein(a: string, b: string): number {
  const s = a.toLowerCase().trim();
  const t = b.toLowerCase().trim();
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const row = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 0; i < s.length; i++) {
    let prev = i;
    row[0] = i + 1;
    for (let j = 0; j < t.length; j++) {
      const cur = row[j + 1]!;
      const cost = s[i] === t[j] ? 0 : 1;
      row[j + 1] = Math.min(row[j + 1]! + 1, row[j]! + 1, prev + cost);
      prev = cur;
    }
  }
  return row[t.length]!;
}

function nameSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length, 1);
  const dist = levenshtein(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

function fullName(p: Player): string {
  return `${p.vorname} ${p.nachname}`.trim();
}

function jahrgangFromPlayer(p: Player): number | undefined {
  if (typeof p.jahrgang === "number") return p.jahrgang;
  if (p.geburtsdatum && /^\d{4}/.test(p.geburtsdatum)) {
    return Number(p.geburtsdatum.slice(0, 4));
  }
  return undefined;
}

export function buildBlindPreview(
  player: Player,
  clubName?: string
): PlayerBlindPreview {
  return {
    jahrgang: jahrgangFromPlayer(player),
    clubName,
    positionen: [...player.positionen],
  };
}

/**
 * Kombinierter Match-Score 0-100.
 * Name (55) + Jahrgang (25) + Verein (12) + Position (8).
 */
export function scorePlayerMatch(
  a: Player,
  b: Player,
  opts?: { clubNameA?: string; clubNameB?: string }
): number {
  if (a.id === b.id) return 100;

  const nameScore =
    Math.max(
      nameSimilarity(fullName(a), fullName(b)),
      nameSimilarity(a.nachname, b.nachname) * 0.85
    ) * 55;

  const jA = jahrgangFromPlayer(a);
  const jB = jahrgangFromPlayer(b);
  let jahrgangScore = 0;
  if (jA !== undefined && jB !== undefined) {
    const diff = Math.abs(jA - jB);
    if (diff === 0) jahrgangScore = 25;
    else if (diff === 1) jahrgangScore = 18;
  }

  let clubScore = 0;
  const cA = (opts?.clubNameA ?? "").toLowerCase().trim();
  const cB = (opts?.clubNameB ?? "").toLowerCase().trim();
  if (cA && cB) {
    clubScore = nameSimilarity(cA, cB) * 12;
  }

  let posScore = 0;
  const setA = new Set(a.positionen.map((p) => p.toLowerCase()));
  const overlap = b.positionen.filter((p) => setA.has(p.toLowerCase()));
  if (a.positionen.length && b.positionen.length) {
    posScore = (overlap.length / Math.max(a.positionen.length, b.positionen.length)) * 8;
  }

  return Math.round(Math.min(100, nameScore + jahrgangScore + clubScore + posScore));
}

export interface MatchCandidate {
  player: Player;
  score: number;
  preview: PlayerBlindPreview;
}

export function findDuplicateCandidates(
  candidate: Player,
  pool: Player[],
  clubsById: Map<string, Club>,
  threshold = MATCH_SCORE_THRESHOLD
): MatchCandidate[] {
  const clubName = candidate.aktuellerClubId
    ? clubsById.get(candidate.aktuellerClubId)?.name
    : undefined;
  const results: MatchCandidate[] = [];
  for (const other of pool) {
    if (other.id === candidate.id) continue;
    const otherClub = other.aktuellerClubId
      ? clubsById.get(other.aktuellerClubId)?.name
      : undefined;
    const score = scorePlayerMatch(candidate, other, {
      clubNameA: clubName,
      clubNameB: otherClub,
    });
    if (score >= threshold) {
      results.push({
        player: other,
        score,
        preview: buildBlindPreview(other, otherClub),
      });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}
