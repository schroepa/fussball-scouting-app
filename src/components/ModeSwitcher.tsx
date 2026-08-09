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
        "inline-flex rounded-full border border-border bg-muted/60 p-1 text-xs",
        className
      )}
      role="group"
      aria-label="Ansicht wechseln"
    >
      {(["scout", "trainer"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => switchMode(value)}
          className={cn(
            "rounded-full px-3 py-2 font-medium min-h-10 focus-ring transition-colors capitalize",
            mode === value
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground border border-transparent"
          )}
          aria-pressed={mode === value}
        >
          {value === "scout" ? "Scout" : "Trainer"}
        </button>
      ))}
    </div>
  );
}
