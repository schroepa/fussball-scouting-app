/**
 * Open-Redirect-Schutz für Login-/OAuth-`next`-Parameter.
 * Erlaubt nur relative Pfade auf derselben Origin.
 */
export function getSafeNextPath(
  raw: string | null | undefined,
  fallback = "/"
): string {
  if (!raw) return fallback;

  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return fallback;
  }

  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  if (path.includes("\\")) return fallback;
  if (path.includes("://")) return fallback;
  if (/[\s<>"]/.test(path)) return fallback;

  return path;
}

/** Liest `?next=` aus einem Location-Search-String. */
export function getSafeNextPathFromSearch(search: string, fallback = "/"): string {
  const next = new URLSearchParams(search.startsWith("?") ? search : `?${search}`).get(
    "next"
  );
  return getSafeNextPath(next, fallback);
}
