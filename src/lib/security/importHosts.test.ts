import { describe, expect, it } from "vitest";
import {
  isAllowedImportHost,
  validateImportUrlOrId,
} from "@/lib/security/importHosts";

describe("isAllowedImportHost", () => {
  it("erlaubt Scout-Quellen", () => {
    expect(isAllowedImportHost("www.transfermarkt.de")).toBe(true);
    expect(isAllowedImportHost("transfermarkt.de")).toBe(true);
    expect(isAllowedImportHost("www.fussball.de")).toBe(true);
  });

  it("lehnt fremde Hosts ab", () => {
    expect(isAllowedImportHost("evil.example")).toBe(false);
    expect(isAllowedImportHost("transfermarkt.de.evil.com")).toBe(false);
    expect(isAllowedImportHost("127.0.0.1")).toBe(false);
  });
});

describe("validateImportUrlOrId", () => {
  it("erlaubt IDs und erlaubte URLs", () => {
    expect(validateImportUrlOrId("35633").ok).toBe(true);
    expect(
      validateImportUrlOrId(
        "https://www.transfermarkt.de/bfc-dynamo-u17/startseite/verein/35633"
      ).ok
    ).toBe(true);
  });

  it("blockiert SSRF-Kandidaten", () => {
    const blocked = validateImportUrlOrId("https://127.0.0.1/secret");
    expect(blocked.ok).toBe(false);
    const meta = validateImportUrlOrId("http://169.254.169.254/latest");
    expect(meta.ok).toBe(false);
  });
});
