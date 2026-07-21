import { describe, expect, it } from "vitest";
import { isHttpUrl, summarizeMatchVideo } from "@/lib/match/video";
import type { Match } from "@/lib/types";

describe("isHttpUrl", () => {
  it("akzeptiert http(s)", () => {
    expect(isHttpUrl("https://veo.co/watch/abc")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
  });

  it("lehnt unsichere Schemas ab", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("ftp://files.example")).toBe(false);
    expect(isHttpUrl(undefined)).toBe(false);
  });
});

describe("summarizeMatchVideo", () => {
  it("fasst Link und Marken zusammen", () => {
    const match = {
      videoUrl: "https://veo.co/x",
      videoMarkers: [{ id: "1" }, { id: "2" }],
    } as Match;
    expect(summarizeMatchVideo(match)).toContain("Marke");
  });
});
