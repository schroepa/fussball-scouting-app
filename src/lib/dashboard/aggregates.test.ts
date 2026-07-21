import { describe, expect, it } from "vitest";
import {
  ageBucket,
  ageFromGeburtsdatum,
  averageGesamt,
  averageRatings,
} from "@/lib/dashboard/aggregates";
import type { PlayerReport } from "@/lib/types";

describe("ageFromGeburtsdatum / ageBucket", () => {
  it("berechnet Alter und Bucket", () => {
    const now = new Date("2026-07-21");
    expect(ageFromGeburtsdatum("2008-01-01", now)).toBe(18);
    expect(ageBucket(18)).toBe("u18");
    expect(ageBucket(22)).toBe("19_23");
    expect(ageBucket(undefined)).toBe("unbekannt");
  });
});

describe("averageRatings / averageGesamt", () => {
  it("mittelt vorhandene Werte", () => {
    const reports = [
      {
        ratings: [
          { attributeKey: "technik", value: 8 },
          { attributeKey: "taktik", value: 6 },
        ],
        gesamtbewertung: 7,
      },
      {
        ratings: [
          { attributeKey: "technik", value: 6 },
          { attributeKey: "taktik", value: 8 },
        ],
        gesamtbewertung: 9,
      },
    ] as PlayerReport[];

    const avg = averageRatings(reports, ["technik", "taktik"]);
    expect(avg.technik).toBe(7);
    expect(avg.taktik).toBe(7);
    expect(averageGesamt(reports)).toBe(8);
  });
});
