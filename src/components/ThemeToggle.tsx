import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  bindSystemThemeListener,
  cycleThemePreference,
  getCurrentMode,
  resolvePreference,
  type ColorMode,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

type Variant = "header" | "sidebar" | "bar";

const labels: Record<ThemePreference, string> = {
  system: "Systemfarbe (folgt Gerät)",
  light: "Hellmodus",
  dark: "Dunkelmodus",
};

export default function ThemeToggle({
  variant = "bar",
}: {
  variant?: Variant;
}) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ColorMode>("light");

  useEffect(() => {
    setPreference(resolvePreference());
    setResolved(getCurrentMode());
    const unbind = bindSystemThemeListener();
    const onChange = (event: Event) => {
      const detail = (
        event as CustomEvent<{ mode: ColorMode; preference?: ThemePreference }>
      ).detail;
      if (detail?.preference) setPreference(detail.preference);
      else setPreference(resolvePreference());
      setResolved(detail?.mode ?? getCurrentMode());
    };
    window.addEventListener("fusca:themechange", onChange);
    return () => {
      unbind();
      window.removeEventListener("fusca:themechange", onChange);
    };
  }, []);

  const Icon =
    preference === "system" ? Monitor : preference === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => {
        const next = cycleThemePreference();
        setPreference(next);
        setResolved(getCurrentMode());
      }}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted focus-ring",
        variant === "sidebar" && "size-9"
      )}
      title={`${labels[preference]} · aktiv: ${resolved === "dark" ? "dunkel" : "hell"}`}
      aria-label={`Darstellung: ${labels[preference]}. Tippen zum Wechseln.`}
    >
      <Icon className="size-4" aria-hidden="true" strokeWidth={1.75} />
    </button>
  );
}
