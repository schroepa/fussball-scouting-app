import { useCallback, useEffect, useState } from "react";
import { countPending } from "../lib/local/repository";
import { pushPendingChanges, registerAutoSync } from "../lib/sync/syncManager";
import { isSupabaseConfigured } from "../lib/supabase/client";

export default function SyncStatusBar() {
  const [pending, setPending] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    setPending(await countPending());
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    refreshPending();

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    registerAutoSync((result) => {
      setMessage(result.message);
      refreshPending();
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshPending]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 6000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    const result = await pushPendingChanges();
    setMessage(result.message);
    await refreshPending();
    setSyncing(false);
    // Detailseite neu laden, damit Badges (pending/synced) aktualisiert werden
    if (result.ok && result.synced > 0) {
      window.dispatchEvent(new Event("scouting:synced"));
    }
  };

  return (
    <div className="relative flex items-center gap-2 text-xs text-primary-foreground/85">
      <span
        className={`inline-flex items-center gap-1 ${online ? "text-accent" : "text-amber-300"}`}
        title={online ? "Online" : "Offline"}
      >
        <span className="text-[10px]">●</span>
        {online ? "Online" : "Offline"}
      </span>

      {pending !== null && pending > 0 && (
        <span className="rounded-full bg-amber-500/90 text-slate-900 px-2 py-0.5 font-semibold">
          {pending} ausstehend
        </span>
      )}

      {isSupabaseConfigured ? (
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing || !online}
          className="rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-40 px-2 py-1 font-medium"
        >
          {syncing ? "Synchronisiere…" : "Sync"}
        </button>
      ) : (
        <span
          className="text-slate-400"
          title="Supabase ist nicht konfiguriert – siehe README.md"
        >
          Lokal
        </span>
      )}

      {message && (
        <div
          role="status"
          className="absolute top-full right-0 mt-2 z-50 w-64 rounded-lg bg-slate-800 text-slate-100 px-3 py-2 shadow-lg text-[11px] leading-snug"
        >
          {message}
        </div>
      )}
    </div>
  );
}
