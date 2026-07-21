import { defineMiddleware } from "astro:middleware";
import { isPublicPath } from "./lib/security/publicPaths";

/**
 * Global security middleware.
 *
 * Responsibilities:
 *  1. Security headers on every response (CSP, framing, MIME sniffing, …)
 *  2. `Cache-Control: private, no-store` for authenticated page routes so
 *     CDNs / shared caches never store private scout data.
 *  3. `X-Fusca-Auth: client-gate` marker so the client AuthGate knows the
 *     middleware is active (full cookie-based SSR auth gate is Phase 2).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  const { pathname } = context.url;
  const accept = context.request.headers.get("accept") ?? "";
  const isHtmlNav = accept.includes("text/html");
  const isProtected = !isPublicPath(pathname);

  // ── 1. Content-Security-Policy ──────────────────────────────────────────
  // 'unsafe-inline' is required for:
  //   • The theme FOUC-prevention script injected by Astro at build time
  //   • React island hydration inline scripts
  // Nonce-based CSP is tracked as a follow-up (Phase 2).
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      [
        "connect-src 'self'",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://www.thesportsdb.com",
        "https://www.transfermarkt.de",
        "https://www.fussball.de",
      ].join(" "),
      "media-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  // ── 2. Standard security headers ────────────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(), payment=()"
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");

  // ── 3. Private cache for protected HTML navigations ──────────────────────
  // Prevents CDNs and shared caches from storing scout data.
  // The app stores its Supabase session in localStorage (client-side), so the
  // server cannot verify the session here without migrating to cookie storage.
  // The client AuthGate remains the primary page-level auth check (Phase 1).
  // Full SSR cookie-based gate is Phase 2 — see docs/SECURITY.md.
  if (isProtected && isHtmlNav) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Fusca-Auth", "client-gate");
  }

  return response;
});
