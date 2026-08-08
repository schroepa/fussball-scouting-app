import { describe, expect, it } from "vitest";
import {
  findDuplicateCandidates,
  levenshtein,
  MATCH_SCORE_THRESHOLD,
  scorePlayerMatch,
} from "./matching";
import type { Club, Player } from "../types";

function player(partial: Partial<Player> & Pick<Player, "id" | "vorname" | "nachname">): Player {
  return {
    positionen: [],
    syncStatus: "synced",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("matching", () => {
  it("levenshtein erkennt Tippfehler", () => {
    expect(levenshtein("Müller", "Mueller")).toBeGreaterThan(0);
    expect(levenshtein("Schmidt", "Schmidt")).toBe(0);
  });

  it("scorePlayerMatch belohnt gleichen Namen und Jahrgang", () => {
    const a = player({
      id: "1",
      vorname: "Max",
      nachname: "Müller",
      jahrgang: 2012,
      positionen: ["ST"],
      aktuellerClubId: "c1",
    });
    const b = player({
      id: "2",
      vorname: "Max",
      nachname: "Muller",
      jahrgang: 2012,
      positionen: ["ST"],
      aktuellerClubId: "c1",
    });
    const score = scorePlayerMatch(a, b, {
      clubNameA: "FV Test",
      clubNameB: "FV Test",
    });
    expect(score).toBeGreaterThanOrEqual(MATCH_SCORE_THRESHOLD);
  });

  it("findDuplicateCandidates filtert unter Schwelle", () => {
    const clubs = new Map<string, Club>([
      [
        "c1",
        {
          id: "c1",
          name: "FV Test",
          land: "Deutschland",
          syncStatus: "synced",
          updatedAt: "",
          createdAt: "",
        },
      ],
    ]);
    const candidate = player({
      id: "a",
      vorname: "Tim",
      nachname: "Bauer",
      jahrgang: 2011,
      aktuellerClubId: "c1",
    });
    const pool = [
      player({
        id: "b",
        vorname: "Tim",
        nachname: "Bauer",
        jahrgang: 2011,
        aktuellerClubId: "c1",
      }),
      player({
        id: "c",
        vorname: "Paul",
        nachname: "Klein",
        jahrgang: 2005,
      }),
    ];
    const hits = findDuplicateCandidates(candidate, pool, clubs);
    expect(hits.some((h) => h.player.id === "b")).toBe(true);
    expect(hits.some((h) => h.player.id === "c")).toBe(false);
  });
});
