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
      className={cn("seg-control w-full", className)}
      role="group"
      aria-label="Ansicht wechseln"
    >
      {(["scout", "trainer"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => switchMode(value)}
          className={cn(
            "flex-1 px-3 py-2 text-xs min-h-10 focus-ring transition-colors",
            mode === value ? "seg-control__thumb" : "seg-control__item"
          )}
          aria-pressed={mode === value}
        >
          {value === "scout" ? "Scout" : "Trainer"}
        </button>
      ))}
    </div>
  );
}
