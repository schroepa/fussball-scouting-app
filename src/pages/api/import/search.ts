import type { APIRoute } from "astro";
import { searchTheSportsDb } from "../../../lib/import/theSportsDb";
import { guardImportApi } from "../../../lib/security/importApiGuard";

export const prerender = false;

/**
 * GET /api/import/search?q=...
 * Sucht Spieler und Vereine über TheSportsDB (kostenloser Hobby-Key).
 */
export const GET: APIRoute = async ({ request, url }) => {
  const guard = await guardImportApi(request);
  if (guard) return guard;

  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return new Response(
      JSON.stringify({ error: "Suchbegriff zu kurz (min. 2 Zeichen)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await searchTheSportsDb(q);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Suche fehlgeschlagen.",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};
