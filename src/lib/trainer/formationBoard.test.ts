import { describe, expect, it } from "vitest";
import {
  defensiveFromOffensive,
  emptyPositionsFromTemplate,
  slotsForTemplate,
} from "./formationBoard";
import { generateInviteCode, resolveAppMode } from "./mode";
import type { Scout } from "../types";

describe("formationBoard", () => {
  it("liefert 11 Slots für 4-3-3", () => {
    expect(slotsForTemplate("4-3-3")).toHaveLength(11);
    expect(emptyPositionsFromTemplate("4-3-3")[0]?.playerId).toBe("");
  });

  it("verschiebt defensiv nach hinten", () => {
    const off = emptyPositionsFromTemplate("4-4-2");
    const def = defensiveFromOffensive(off);
    expect(def[0]!.y).toBeLessThan(off[0]!.y);
  });
});

describe("trainer mode helpers", () => {
  it("resolveAppMode bevorzugt gespeicherten Modus nur bei Rolle", () => {
    const scout: Scout = {
      id: "1",
      name: "T",
      email: "t@example.com",
      roles: ["trainer", "scout"],
      primaryMode: "trainer",
    };
    expect(resolveAppMode(scout)).toBe("trainer");
  });

  it("generateInviteCode hat Format XXXX-XXXX", () => {
    expect(generateInviteCode()).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });
});
