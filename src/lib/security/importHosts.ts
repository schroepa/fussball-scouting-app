/**
 * SSRF-Schutz für Import-Endpunkte: nur bekannte Scout-Quellen.
 * Bloße IDs/Slugs (ohne Schema) sind erlaubt, die Scraper bauen die URL selbst.
 */

const ALLOWED_HOST_SUFFIXES = ["transfermarkt.de", "fussball.de"] as const;

export function isAllowedImportHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

export type ImportUrlValidation =
  | { ok: true }
  | { ok: false; error: string };

export function validateImportUrlOrId(input: string): ImportUrlValidation {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Leere Eingabe." };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: true };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "Ungültige URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Nur http(s)-URLs erlaubt." };
  }

  if (!isAllowedImportHost(url.hostname)) {
    return {
      ok: false,
      error: "Domain nicht erlaubt (nur transfermarkt.de / fussball.de).",
    };
  }

  return { ok: true };
}
