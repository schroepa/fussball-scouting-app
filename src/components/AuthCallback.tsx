import { useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

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
      window.location.href = "/";
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

  return <p className="text-slate-500 text-center">Anmeldung wird abgeschlossen…</p>;
}
