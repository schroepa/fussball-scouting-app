import { createClient } from "@supabase/supabase-js";

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export type ApiAuthResult =
  | { ok: true; userId: string; mode: "supabase" | "local" }
  | { ok: false; response: Response };

/**
 * Schützt Server-API-Routen.
 * - Ohne Supabase-Env: Lokal-Modus (Import für Dev/Offline erlaubt).
 * - Mit Supabase: Bearer-Access-Token Pflicht und per `auth.getUser` geprüft.
 */
export async function requireApiUser(request: Request): Promise<ApiAuthResult> {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as
    | string
    | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: true, userId: "local", mode: "local" };
  }

  const header = request.headers.get("Authorization");
  const token =
    header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

  if (!token) {
    return {
      ok: false,
      response: jsonError(401, "Anmeldung erforderlich (Bearer-Token fehlt)."),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return {
      ok: false,
      response: jsonError(401, "Sitzung ungültig oder abgelaufen."),
    };
  }

  return { ok: true, userId: data.user.id, mode: "supabase" };
}
