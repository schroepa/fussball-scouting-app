import { useCallback, useEffect, useState } from "react";
import {
  getSyncQueueStats,
  resetSyncErrorsToPending,
  type SyncQueueStats,
} from "../lib/local/repository";
import { registerAutoSync, syncAll, type SyncResult } from "../lib/sync/syncManager";
import { isSupabaseConfigured } from "../lib/supabase/client";
import { cn } from "@/lib/utils";
import { RefreshCw, X } from "lucide-react";

type Variant = "header" | "sidebar";

const emptyStats: SyncQueueStats = { pending: 0, error: 0, total: 0 };

export default function SyncStatusBar({
  variant = "header",
}: {
  variant?: Variant;
}) {
  const [stats, setStats] = useState<SyncQueueStats>(emptyStats);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const refreshStats = useCallback(async () => {
    setStats(await getSyncQueueStats());
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    void refreshStats();

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("scouting:synced", () => {
      void refreshStats();
    });

    registerAutoSync((result) => {
      setLastResult(result);
      if (!result.ok || result.failed > 0) setPanelOpen(true);
      void refreshStats();
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshStats]);

  useEffect(() => {
    if (!lastResult?.ok || lastResult.failed > 0) return;
    if (!panelOpen) return;
    const timer = window.setTimeout(() => setPanelOpen(false), 5000);
    return () => window.clearTimeout(timer);
  }, [lastResult, panelOpen]);

  const runSync = async (retryErrors: boolean) => {
    setSyncing(true);
    setPanelOpen(true);
    try {
      if (retryErrors) {
        await resetSyncErrorsToPending();
      }
      const result = await syncAll();
      setLastResult(result);
      await refreshStats();
      window.dispatchEvent(new Event("scouting:synced"));
    } finally {
      setSyncing(false);
    }
  };

  const isHeader = variant === "header";
  const hasErrors = stats.error > 0 || (lastResult != null && !lastResult.ok);
  const queueLabel =
    stats.error > 0
      ? `${stats.error} Fehler`
      : stats.pending > 0
        ? `${stats.pending} ausstehend`
        : null;

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

      {queueLabel ? (
        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          className={cn(
            "rounded-md px-2 py-0.5 font-semibold",
            stats.error > 0
              ? "bg-destructive text-destructive-foreground"
              : "bg-amber-500/90 text-foreground"
          )}
          title="Sync-Details"
        >
          {queueLabel}
        </button>
      ) : null}

      {isSupabaseConfigured ? (
        <button
          type="button"
          onClick={() => void runSync(stats.error > 0)}
          disabled={syncing || !online}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium disabled:opacity-40",
            isHeader
              ? "bg-white/10 hover:bg-white/20"
              : hasErrors
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          title={
            stats.error > 0
              ? "Fehlerhafte Uploads erneut versuchen"
              : "Jetzt synchronisieren"
          }
        >
          <RefreshCw className={cn("size-3", syncing && "animate-spin")} />
          {syncing ? "Sync…" : stats.error > 0 ? "Retry" : "Sync"}
        </button>
      ) : (
        <span
          className={
            isHeader ? "text-primary-foreground/60" : "text-muted-foreground"
          }
        >
          Lokal
        </span>
      )}

      {panelOpen && (lastResult || stats.total > 0) ? (
        <div
          role="status"
          className={cn(
            "absolute z-50 w-72 rounded-lg border bg-card text-card-foreground px-3 py-2.5 shadow-lg text-[11px] leading-snug",
            isHeader ? "top-full right-0 mt-2" : "bottom-full left-0 mb-2"
          )}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="font-semibold text-xs">
              {hasErrors ? "Sync-Problem" : "Sync-Status"}
            </p>
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted"
              onClick={() => setPanelOpen(false)}
              aria-label="Schließen"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <p className="text-muted-foreground mb-2">
            {stats.pending > 0
              ? `${stats.pending} wartend`
              : "Nichts wartend"}
            {" · "}
            {stats.error > 0
              ? `${stats.error} mit Fehler`
              : "keine lokalen Fehler"}
          </p>

          {lastResult ? (
            <p
              className={cn(
                "mb-2",
                lastResult.ok ? "text-foreground" : "text-destructive"
              )}
            >
              {lastResult.message}
            </p>
          ) : null}

          {lastResult?.errors && lastResult.errors.length > 0 ? (
            <ul className="mb-2 space-y-1 text-destructive list-disc pl-3">
              {lastResult.errors.slice(0, 3).map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={syncing || !online || !isSupabaseConfigured}
              onClick={() => void runSync(true)}
              className="rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground disabled:opacity-40"
            >
              Erneut versuchen
            </button>
            <a
              href="/hilfe"
              className="rounded-md border border-border px-2 py-1 font-medium hover:bg-muted"
            >
              Hilfe
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
