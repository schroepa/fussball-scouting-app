import { useEffect, useState } from "react";
import { getCurrentSession } from "../lib/auth/session";
import { purgeForeignLocalData } from "../lib/local/repository";
import { isSupabaseConfigured } from "../lib/supabase/client";

interface AuthGateProps {
  /** Wenn false (z. B. Login-/Callback-Seiten), keine Weiterleitung. */
  requireAuth?: boolean;
}

/**
 * Leitet auf /login weiter, sobald Supabase konfiguriert ist und der Scout
 * noch nicht angemeldet ist. Nach Login: fremde lokale Daten entfernen.
 */
export default function AuthGate({ requireAuth = true }: AuthGateProps) {
  const [checking, setChecking] = useState(requireAuth && isSupabaseConfigured);

  useEffect(() => {
    if (!requireAuth || !isSupabaseConfigured) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const session = await getCurrentSession();
      if (cancelled) return;
      if (!session.isAuthenticated) {
        const next = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.replace(`/login?next=${next}`);
        return;
      }
      try {
        await purgeForeignLocalData(session.scout.id);
        window.dispatchEvent(new Event("scouting:synced"));
      } catch (err) {
        console.warn("Lokale Datenbereinigung fehlgeschlagen", err);
      }
      if (!cancelled) setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [requireAuth]);

  if (!checking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Prüfe Anmeldung…</p>
    </div>
  );
}
