import { describe, expect, it } from "vitest";
import {
  formatFormationPair,
  matchHasFormations,
  sortPhases,
  summarizeMatchFormations,
} from "@/lib/match/formations";
import type { Match } from "@/lib/types";

describe("formations helpers", () => {
  it("sortiert Phasen nach Minute", () => {
    expect(
      sortPhases([
        { id: "b", abMinute: 60 },
        { id: "a", abMinute: 15 },
      ]).map((p) => p.id)
    ).toEqual(["a", "b"]);
  });

  it("formatiert Paare und Zusammenfassung", () => {
    expect(formatFormationPair("4-3-3", "4-3-3")).toBe("4-3-3");
    expect(formatFormationPair("4-3-3", "5-3-2")).toBe("4-3-3 / 5-3-2");

    const match = {
      formationHeimOff: "4-3-3",
      formationGastDef: "5-4-1",
      phases: [{ id: "1", abMinute: 70 }],
    } as Match;

    expect(matchHasFormations(match)).toBe(true);
    expect(summarizeMatchFormations(match)).toContain("Heim");
    expect(summarizeMatchFormations(match)).toContain("1 Phase");
  });
});
