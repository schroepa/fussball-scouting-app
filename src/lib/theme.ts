export const THEME_STORAGE_KEY = "fusca_color_mode";

export type ColorMode = "light" | "dark";

export function getSystemMode(): ColorMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getStoredMode(): ColorMode | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    /* private mode */
  }
  return null;
}

export function resolveInitialMode(): ColorMode {
  return getStoredMode() ?? getSystemMode();
}

export function applyColorMode(mode: ColorMode): void {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", mode === "dark" ? "#1c1c22" : "#fafafa");
  }
}

export function setColorMode(mode: ColorMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyColorMode(mode);
  window.dispatchEvent(
    new CustomEvent("fusca:themechange", { detail: { mode } })
  );
}

export function toggleColorMode(): ColorMode {
  const next: ColorMode = document.documentElement.classList.contains("dark")
    ? "light"
    : "dark";
  setColorMode(next);
  return next;
}

export function getCurrentMode(): ColorMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
