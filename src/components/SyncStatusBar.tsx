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

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    const result = await pushPendingChanges();
    setMessage(result.message);
    await refreshPending();
    setSyncing(false);
  };

  return (
    <div className="flex items-center gap-2 text-xs text-slate-200">
      <span
        className={`inline-flex items-center gap-1 ${online ? "text-emerald-400" : "text-amber-400"}`}
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
        <span className="text-slate-400" title="Supabase ist nicht konfiguriert – siehe README.md">
          Lokal
        </span>
      )}

      {message && (
        <span className="sr-only" role="status" aria-live="polite">
          {message}
        </span>
      )}
    </div>
  );
}
