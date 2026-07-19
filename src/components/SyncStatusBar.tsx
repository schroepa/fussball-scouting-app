import { useCallback, useEffect, useState } from "react";
import { countPending } from "../lib/local/repository";
import { registerAutoSync, syncAll } from "../lib/sync/syncManager";
import { isSupabaseConfigured } from "../lib/supabase/client";
import { cn } from "@/lib/utils";

type Variant = "header" | "sidebar";

export default function SyncStatusBar({
  variant = "header",
}: {
  variant?: Variant;
}) {
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
    const result = await syncAll();
    setMessage(result.message);
    await refreshPending();
    setSyncing(false);
    if (result.ok && (result.synced > 0 || result.pulled > 0)) {
      window.dispatchEvent(new Event("scouting:synced"));
    } else if (result.ok) {
      // Auch bei „alles aktuell“ Listen refreshen (Pull kann 0 zählen,
      // wenn Daten schon lokal waren – nach erstem Pull aber neu).
      window.dispatchEvent(new Event("scouting:synced"));
    }
  };

  const isHeader = variant === "header";

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 text-xs",
        isHeader ? "text-primary-foreground/85" : "text-foreground"
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1",
          online
            ? isHeader
              ? "text-accent"
              : "text-primary"
            : "text-amber-500"
        )}
        title={online ? "Online" : "Offline"}
      >
        <span className="text-[10px]">●</span>
        {online ? "Online" : "Offline"}
      </span>

      {pending !== null && pending > 0 && (
        <span className="rounded-full bg-amber-500/90 text-foreground px-2 py-0.5 font-semibold">
          {pending} ausstehend
        </span>
      )}

      {isSupabaseConfigured ? (
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing || !online}
          className={cn(
            "rounded-md px-2 py-1 font-medium disabled:opacity-40",
            isHeader
              ? "bg-white/10 hover:bg-white/20"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {syncing ? "Sync…" : "Sync"}
        </button>
      ) : (
        <span className={isHeader ? "text-primary-foreground/60" : "text-muted-foreground"}>
          Lokal
        </span>
      )}

      {message && (
        <div
          role="status"
          className="absolute top-full right-0 mt-2 z-50 w-64 rounded-lg bg-card border border-border text-card-foreground px-3 py-2 shadow-lg text-[11px] leading-snug"
        >
          {message}
        </div>
      )}
    </div>
  );
}
