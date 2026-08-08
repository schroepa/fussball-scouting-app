import { useEffect, useState } from "react";
import { getCurrentSession } from "../lib/auth/session";
import {
  hasRole,
  resolveAppMode,
  setStoredAppMode,
} from "../lib/trainer/mode";
import type { AppMode, Scout } from "../lib/types";
import { cn } from "@/lib/utils";

export default function ModeSwitcher({
  className,
}: {
  className?: string;
}) {
  const [scout, setScout] = useState<Scout | null>(null);
  const [mode, setMode] = useState<AppMode>("scout");

  const reload = async () => {
    const session = await getCurrentSession();
    setScout(session.scout);
    setMode(resolveAppMode(session.scout));
  };

  useEffect(() => {
    void reload();
    const onChange = () => void reload();
    window.addEventListener("fusca:profile-changed", onChange);
    window.addEventListener("fusca:mode-changed", onChange);
    return () => {
      window.removeEventListener("fusca:profile-changed", onChange);
      window.removeEventListener("fusca:mode-changed", onChange);
    };
  }, []);

  if (!scout || !hasRole(scout, "scout") || !hasRole(scout, "trainer")) {
    return null;
  }

  const switchMode = (next: AppMode) => {
    setStoredAppMode(next);
    setMode(next);
  };

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs",
        className
      )}
      role="group"
      aria-label="Ansicht wechseln"
    >
      <button
        type="button"
        onClick={() => switchMode("scout")}
        className={cn(
          "rounded-md px-2.5 py-1.5 font-medium min-h-8",
          mode === "scout"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={mode === "scout"}
      >
        Scout
      </button>
      <button
        type="button"
        onClick={() => switchMode("trainer")}
        className={cn(
          "rounded-md px-2.5 py-1.5 font-medium min-h-8",
          mode === "trainer"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={mode === "trainer"}
      >
        Trainer
      </button>
    </div>
  );
}
