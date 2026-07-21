/**
 * Paths that do not require authentication.
 *
 * Used by the middleware to decide:
 *  - whether to set `Cache-Control: private, no-store`
 *  - (future) whether to enforce cookie-based auth gate
 */

const PUBLIC_PREFIXES = [
  "/login",
  "/auth/",
  "/api/",       // API routes carry their own Bearer-token auth
  "/_astro/",    // Astro build assets
  "/icons/",
  "/favicon",
  "/manifest",
  "/sw.js",
  "/workbox",
] as const;

/**
 * Returns true when `pathname` is a public path that does not require
 * an authenticated session at the middleware layer.
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
