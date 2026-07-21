import { useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

function getNextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        window.location.href = "/";
        return;
      }
      // `detectSessionInUrl: true` verarbeitet den Redirect automatisch.
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setStatus("error");
        return;
      }

      // Sicherstellen, dass der Scout in public.scouts existiert (Fallback,
      // falls der Auth-Trigger noch nicht angelegt wurde).
      const user = data.session.user;
      await supabase.from("scouts").upsert(
        {
          id: user.id,
          name:
            (user.user_metadata?.full_name as string | undefined) ??
            user.email ??
            "Scout",
          email: user.email ?? "",
          auth_provider:
            (user.app_metadata?.provider as string | undefined) ?? "google",
        },
        { onConflict: "id" }
      );

      window.location.href = getNextPath();
    })();
  }, []);

  if (status === "error") {
    return (
      <div className="text-center space-y-2">
        <p className="text-red-600">Anmeldung fehlgeschlagen.</p>
        <a href="/login" className="underline text-emerald-700">
          Erneut versuchen
        </a>
      </div>
    );
  }

  return <p className="text-muted-foreground text-center">Anmeldung wird abgeschlossen…</p>;
}
