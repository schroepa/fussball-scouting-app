import { getSupabaseClient, isSupabaseConfigured } from "../supabase/client";
import { mergeScoutWithProfile } from "../trainer/mode";
import type { Scout } from "../types";

const LOCAL_SCOUT_KEY = "scouting_local_scout";

/**
 * Erzeugt/liest ein lokales Scout-Profil (Fallback, falls Supabase noch
 * nicht konfiguriert ist oder der Scout offline arbeitet, ohne sich vorher
 * eingeloggt zu haben). Damit bleibt die App auch ohne Backend vollständig
 * nutzbar, nur die Synchronisation entfällt dann.
 */
function getOrCreateLocalScout(): Scout {
  if (typeof window === "undefined") {
    return {
      id: "local-scout",
      name: "Lokaler Scout",
      email: "",
      roles: ["scout"],
    };
  }
  const raw = window.localStorage.getItem(LOCAL_SCOUT_KEY);
  if (raw) {
    try {
      return mergeScoutWithProfile(JSON.parse(raw) as Scout);
    } catch {
      // fällt durch und wird neu erzeugt
    }
  }
  const scout: Scout = {
    id: crypto.randomUUID(),
    name: "Lokaler Scout",
    email: "",
    authProvider: "local",
    roles: ["scout"],
  };
  window.localStorage.setItem(LOCAL_SCOUT_KEY, JSON.stringify(scout));
  return mergeScoutWithProfile(scout);
}

export interface SessionState {
  scout: Scout;
  isAuthenticated: boolean;
  isLocalOnly: boolean;
}

/** Liefert den aktuellen Scout: eingeloggter Supabase-User ODER lokaler Fallback. */
export async function getCurrentSession(): Promise<SessionState> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (user) {
      return {
        scout: mergeScoutWithProfile({
          id: user.id,
          name:
            (user.user_metadata?.full_name as string | undefined) ??
            user.email ??
            "Scout",
          email: user.email ?? "",
          authProvider: user.app_metadata?.provider as string | undefined,
          roles: ["scout"],
        }),
        isAuthenticated: true,
        isLocalOnly: false,
      };
    }
  }
  return {
    scout: getOrCreateLocalScout(),
    isAuthenticated: false,
    isLocalOnly: !isSupabaseConfigured,
  };
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase ist nicht konfiguriert.");
  const redirectTo = `${window.location.origin}/auth/callback`;
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}

export async function signInWithMagicLink(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase ist nicht konfiguriert.");
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}
