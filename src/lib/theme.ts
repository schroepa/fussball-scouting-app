export const THEME_STORAGE_KEY = "fusca_color_mode";

/** Resolved appearance applied to the document. */
export type ColorMode = "light" | "dark";

/** User preference: follow OS or force a mode. */
export type ThemePreference = "system" | ColorMode;

const MEDIA = "(prefers-color-scheme: dark)";

export function getSystemMode(): ColorMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(MEDIA).matches ? "dark" : "light";
}

export function getStoredPreference(): ThemePreference | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "system" || value === "light" || value === "dark") return value;
  } catch {
    /* private mode */
  }
  return null;
}

/** Default: system. Legacy light/dark values remain valid overrides. */
export function resolvePreference(): ThemePreference {
  return getStoredPreference() ?? "system";
}

export function resolveInitialMode(): ColorMode {
  const pref = resolvePreference();
  return pref === "system" ? getSystemMode() : pref;
}

export function themeColorFor(mode: ColorMode): string {
  return mode === "dark" ? "#0b0d12" : "#eef0f4";
}

export function applyColorMode(mode: ColorMode): void {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
  root.dataset.theme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", themeColorFor(mode));
}

export function setThemePreference(preference: ThemePreference): ColorMode {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
  const mode = preference === "system" ? getSystemMode() : preference;
  applyColorMode(mode);
  window.dispatchEvent(
    new CustomEvent("fusca:themechange", {
      detail: { mode, preference },
    })
  );
  return mode;
}

/** Cycles system → light → dark → system. */
export function cycleThemePreference(): ThemePreference {
  const current = resolvePreference();
  const next: ThemePreference =
    current === "system" ? "light" : current === "light" ? "dark" : "system";
  setThemePreference(next);
  return next;
}

/** @deprecated Prefer cycleThemePreference / setThemePreference */
export function setColorMode(mode: ColorMode): void {
  setThemePreference(mode);
}

/** @deprecated Prefer cycleThemePreference */
export function toggleColorMode(): ColorMode {
  return setThemePreference(getCurrentMode() === "dark" ? "light" : "dark");
}

export function getCurrentMode(): ColorMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Keep DOM in sync when OS theme changes and preference is system. */
export function bindSystemThemeListener(): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(MEDIA);
  const onChange = () => {
    if (resolvePreference() === "system") {
      applyColorMode(getSystemMode());
      window.dispatchEvent(
        new CustomEvent("fusca:themechange", {
          detail: { mode: getSystemMode(), preference: "system" as const },
        })
      );
    }
  };
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
