import { describe, expect, it } from "vitest";
import {
  extractTransfermarktClubId,
  extractTransfermarktSlug,
} from "@/lib/import/transfermarkt";

describe("transfermarkt parsers", () => {
  it("extrahiert Vereins-ID und Slug", () => {
    const url =
      "https://www.transfermarkt.de/bfc-dynamo-u17/startseite/verein/35633";
    expect(extractTransfermarktClubId(url)).toBe("35633");
    expect(extractTransfermarktClubId("35633")).toBe("35633");
    expect(extractTransfermarktSlug(url)).toBe("bfc-dynamo-u17");
  });
});
