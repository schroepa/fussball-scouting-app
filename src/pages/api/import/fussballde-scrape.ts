import type { APIRoute } from "astro";
import {
  scrapeClubWithOptionalSquads,
  scrapeFussballDe,
  scrapeTeamSquad,
  type SquadImportResult,
} from "../../../lib/import/fussballDeScraper";
import { guardImportApi } from "../../../lib/security/importApiGuard";
import { validateImportUrlOrId } from "../../../lib/security/importHosts";

export const prerender = false;

/**
 * POST /api/import/fussballde-scrape
 * Body: {
 *   urlOrId: string,
 *   mode?: "auto" | "club-teams" | "squad",
 *   teamId?: string,
 *   season?: string,
 *   importAllSquads?: boolean
 * }
 *
 * Leichter HTML-Scraper für Vereinsmannschaften + Kader (wenn öffentlich).
 */
export const POST: APIRoute = async ({ request }) => {
  const guard = await guardImportApi(request);
  if (guard) return guard;

  let body: {
    urlOrId?: string;
    mode?: "auto" | "club-teams" | "squad";
    teamId?: string;
    season?: string;
    importAllSquads?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Ungültiger JSON-Body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const urlOrId = body.urlOrId?.trim() ?? "";
  if (!urlOrId && !body.teamId) {
    return new Response(
      JSON.stringify({
        error: "urlOrId oder teamId fehlt (fussball.de-URL oder ID).",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (urlOrId) {
    const hostCheck = validateImportUrlOrId(urlOrId);
    if (!hostCheck.ok) {
      return new Response(JSON.stringify({ error: hostCheck.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  try {
    let result: SquadImportResult;
    const mode = body.mode ?? "auto";

    if (body.teamId && urlOrId) {
      result = await scrapeClubWithOptionalSquads(urlOrId, {
        season: body.season,
        teamId: body.teamId,
      });
    } else if (mode === "squad" || body.teamId) {
      result = await scrapeTeamSquad(body.teamId || urlOrId);
    } else if (mode === "club-teams") {
      result = await scrapeClubWithOptionalSquads(urlOrId, {
        season: body.season,
        importAllSquads: body.importAllSquads,
      });
    } else {
      result = await scrapeFussballDe(urlOrId, {
        season: body.season,
        importAllSquads: body.importAllSquads,
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Scrape fehlgeschlagen.",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};
