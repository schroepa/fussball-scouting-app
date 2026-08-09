import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as
  | string
  | undefined;

/**
 * Ob Supabase konfiguriert ist. Solange kein Supabase-Projekt angebunden
 * ist, läuft die App im reinen Lokal-Modus (Dexie/IndexedDB) weiter -
 * Erfassung funktioniert, nur die Synchronisation ist deaktiviert.
 * Siehe README.md für die Einrichtung.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
