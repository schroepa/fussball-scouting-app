import { describe, expect, it } from "vitest";
import {
  getSafeNextPath,
  getSafeNextPathFromSearch,
} from "@/lib/security/safeRedirect";

describe("getSafeNextPath", () => {
  it("erlaubt relative App-Pfade", () => {
    expect(getSafeNextPath("/reports")).toBe("/reports");
    expect(getSafeNextPath("/dashboard?tab=team")).toBe("/dashboard?tab=team");
  });

  it("blockiert Open Redirects", () => {
    expect(getSafeNextPath("//evil.example")).toBe("/");
    expect(getSafeNextPath("https://evil.example")).toBe("/");
    expect(getSafeNextPath("/\\evil.example")).toBe("/");
    expect(getSafeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("nutzt Fallback bei leerem Wert", () => {
    expect(getSafeNextPath(null, "/login")).toBe("/login");
    expect(getSafeNextPath("   ")).toBe("/");
  });
});

describe("getSafeNextPathFromSearch", () => {
  it("liest next aus Query", () => {
    expect(getSafeNextPathFromSearch("?next=%2Fplayers")).toBe("/players");
    expect(getSafeNextPathFromSearch("?next=//evil")).toBe("/");
  });
});
