import type { APIRoute } from "astro";
import { importViaSportDbOrTransfermarkt } from "../../../lib/import/sportDb";

export const prerender = false;

/**
 * POST /api/import/transfermarkt
 * Body: { "urlOrId": "https://www.transfermarkt.de/.../verein/35633" }
 *
 * Primär: direkter Transfermarkt-Scrape (Jugendkader). Optionaler Fallback-
 * Versuch über SportDB.dev wenn SPORTDB_API_KEY gesetzt ist.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: { urlOrId?: string };
  try {
    body = (await request.json()) as { urlOrId?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Ungültiger JSON-Body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const urlOrId = body.urlOrId?.trim() ?? "";
  if (!urlOrId) {
    return new Response(
      JSON.stringify({
        error: "urlOrId fehlt (Transfermarkt-URL oder Vereins-ID).",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await importViaSportDbOrTransfermarkt(urlOrId);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Transfermarkt-Import fehlgeschlagen.",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};
