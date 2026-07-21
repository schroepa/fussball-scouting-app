import { describe, expect, it } from "vitest";
import { slugifyAttributeKey } from "@/lib/attributeKey";

describe("slugifyAttributeKey", () => {
  it("normalisiert Umlaute und Leerzeichen", () => {
    expect(slugifyAttributeKey("Kopfball Stärken")).toBe("kopfball_staerken");
    expect(slugifyAttributeKey("  Übersicht  ")).toBe("uebersicht");
  });

  it("fällt auf Fallback zurück", () => {
    expect(slugifyAttributeKey("!!!")).toBe("feld");
  });
});
