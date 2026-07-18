import { useState, type FormEvent } from "react";
import { isSupabaseConfigured } from "../lib/supabase/client";
import { signInWithGoogle, signInWithMagicLink } from "../lib/auth/session";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800 text-sm space-y-2">
        <p className="font-semibold">Supabase ist noch nicht konfiguriert.</p>
        <p>
          Die App funktioniert bereits vollständig lokal (Erfassung &amp; Offline-Nutzung).
          Für Login und Synchronisation über mehrere Geräte hinweg trage
          <code className="mx-1 rounded bg-amber-100 px-1">PUBLIC_SUPABASE_URL</code>
          und
          <code className="mx-1 rounded bg-amber-100 px-1">PUBLIC_SUPABASE_ANON_KEY</code>
          in den Umgebungsvariablen ein (siehe README.md).
        </p>
        <a href="/" className="inline-block underline font-medium">
          Trotzdem lokal weiterarbeiten →
        </a>
      </div>
    );
  }

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithMagicLink(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleGoogle}
        className="w-full rounded-lg border border-slate-300 bg-white py-3 font-medium flex items-center justify-center gap-2"
      >
        <span>🔵</span> Mit Google anmelden
      </button>

      <div className="flex items-center gap-2 text-slate-400 text-xs">
        <div className="flex-1 h-px bg-slate-200" />
        oder per E-Mail
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {sent ? (
        <p className="text-emerald-700 text-sm text-center">
          ✅ Link zum Einloggen wurde an <strong>{email}</strong> geschickt. Bitte
          E-Mail-Postfach prüfen.
        </p>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-2">
          <input
            type="email"
            required
            placeholder="deine@email.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 text-white py-3 font-semibold disabled:opacity-50"
          >
            {loading ? "Sende Link…" : "Magic Link senden"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
