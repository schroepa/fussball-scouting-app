import { requireApiUser } from "./apiAuth";
import { checkRateLimit, IMPORT_RATE_LIMIT } from "./rateLimit";

function jsonError(status: number, error: string, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}

/**
 * Combined auth + rate-limit guard for all `/api/import/*` routes.
 *
 * Returns a ready `Response` (4xx) when the request must be rejected,
 * or `null` when the caller should continue handling the request.
 *
 * Usage:
 *   const guard = await guardImportApi(request);
 *   if (guard) return guard;
 */
export async function guardImportApi(request: Request): Promise<Response | null> {
  // 1. Auth check (Bearer token / Supabase session).
  const auth = await requireApiUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  // 2. Rate limiting - derive key from forwarded IP headers or fall back to "local".
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local";

  const result = checkRateLimit(ip, IMPORT_RATE_LIMIT);
  if (!result.ok) {
    return jsonError(
      429,
      "Zu viele Anfragen. Bitte kurz warten.",
      { "Retry-After": String(result.retryAfterSec) }
    );
  }

  return null;
}
