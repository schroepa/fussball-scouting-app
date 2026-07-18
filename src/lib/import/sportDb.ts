/**
 * Optionaler Adapter für https://sportdb.dev
 *
 * SportDB ist ein REST-/MCP-Proxy u. a. auf Transfermarkt:
 *   GET https://api.sportdb.dev/api/transfermarkt/{full_path}
 * Header: X-API-Key
 *
 * Ohne Key (Free-Signup auf sportdb.dev) nicht nutzbar. Für Jugendkader
 * bevorzugen wir den direkten Transfermarkt-Scraper in transfermarkt.ts.
 */
import { importTransfermarktClub } from "./transfermarkt";
import type { TransfermarktImportResult } from "./transfermarkt";

export function isSportDbConfigured(): boolean {
  return Boolean(import.meta.env.SPORTDB_API_KEY);
}

/**
 * Versucht denselben Kader über SportDB zu laden. Schlägt fehl oder Key fehlt
 * → Fallback auf direkten Transfermarkt-Scrape.
 */
export async function importViaSportDbOrTransfermarkt(
  urlOrId: string
): Promise<TransfermarktImportResult & { via?: "sportdb" | "transfermarkt" }> {
  const key = import.meta.env.SPORTDB_API_KEY as string | undefined;
  if (!key) {
    const result = await importTransfermarktClub(urlOrId);
    return { ...result, via: "transfermarkt" };
  }

  try {
    const path = toSportDbTransfermarktPath(urlOrId);
    if (!path) {
      throw new Error("URL konnte nicht in einen SportDB-Pfad übersetzt werden.");
    }

    const res = await fetch(
      `https://api.sportdb.dev/api/transfermarkt/${path}`,
      {
        headers: {
          "X-API-Key": key,
          Accept: "application/json, text/html, */*",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`SportDB HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    const raw = await res.text();

    // Wenn SportDB HTML zurückgibt: nicht parsen hier – Fallback auf direkten Scrape.
    // Strukturiertes JSON (falls vorhanden) später mappen.
    if (contentType.includes("application/json")) {
      const data = JSON.parse(raw) as unknown;
      const mapped = tryMapSportDbJson(data, urlOrId);
      if (mapped) return { ...mapped, via: "sportdb" };
    }

    // Unbekanntes Format → direkter Scrape (zuverlässig für Jugendkader).
    const fallback = await importTransfermarktClub(urlOrId);
    return {
      ...fallback,
      via: "transfermarkt",
      notice: `${fallback.notice ?? ""} (SportDB-Antwort nicht auswertbar – direkter Transfermarkt-Scrape genutzt.)`.trim(),
    };
  } catch {
    const fallback = await importTransfermarktClub(urlOrId);
    return {
      ...fallback,
      via: "transfermarkt",
      notice: `${fallback.notice ?? ""} (SportDB nicht erreichbar – direkter Transfermarkt-Scrape.)`.trim(),
    };
  }
}

function toSportDbTransfermarktPath(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  const m = trimmed.match(
    /transfermarkt\.[a-z.]+\/(.+?)(?:\?|#|$)/i
  );
  if (m?.[1]) return m[1].replace(/^\/+/, "");

  if (/^\d{2,8}$/.test(trimmed)) {
    return `verein/kader/verein/${trimmed}`;
  }
  return null;
}

function tryMapSportDbJson(
  _data: unknown,
  _urlOrId: string
): TransfermarktImportResult | null {
  // SportDB-Antwortformat ist je nach Endpoint unterschiedlich und ohne Key
  // nicht verifizierbar. Bewusst null → Fallback.
  return null;
}
