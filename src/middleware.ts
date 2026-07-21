import { defineMiddleware } from "astro:middleware";

/**
 * Basis-Security-Header für alle Responses.
 * Strikte CSP folgt später (Inline-Theme-Script + Islands brauchen Nonces).
 */
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(), payment=()"
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");

  return response;
});
