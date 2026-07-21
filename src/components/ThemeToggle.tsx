import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  getCurrentMode,
  resolveInitialMode,
  toggleColorMode,
  type ColorMode,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

type Variant = "header" | "sidebar" | "bar";

export default function ThemeToggle({
  variant = "bar",
}: {
  variant?: Variant;
}) {
  const [mode, setMode] = useState<ColorMode>("light");

  useEffect(() => {
    setMode(resolveInitialMode());
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ mode: ColorMode }>).detail;
      if (detail?.mode) setMode(detail.mode);
      else setMode(getCurrentMode());
    };
    window.addEventListener("fusca:themechange", onChange);
    return () => window.removeEventListener("fusca:themechange", onChange);
  }, []);

  const isHeader = variant === "header";
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={() => setMode(toggleColorMode())}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors",
        isHeader
          ? "size-8 bg-white/10 hover:bg-white/20 text-primary-foreground"
          : variant === "sidebar"
            ? "size-8 border border-border hover:bg-muted text-foreground"
            : "size-8 border border-border bg-card hover:bg-muted text-foreground"
      )}
      title={isDark ? "Hellmodus" : "Dunkelmodus"}
      aria-label={isDark ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
