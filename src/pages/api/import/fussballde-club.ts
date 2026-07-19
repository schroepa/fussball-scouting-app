import type { APIRoute } from "astro";
import { importFussballDeClub } from "../../../lib/import/fussballDe";

export const prerender = false;

/**
 * POST /api/import/fussballde-club
 * Body: { "urlOrId": "https://www.fussball.de/verein/.../-/id/..." }
 *
 * Holt Verein + Spiele von api-fussball.de (Token serverseitig via
 * API_FUSSBALL_TOKEN). Spieler-Kader liefert diese API nicht.
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
      JSON.stringify({ error: "urlOrId fehlt (fussball.de-URL oder ID)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await importFussballDeClub(urlOrId);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Import fehlgeschlagen.",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};
