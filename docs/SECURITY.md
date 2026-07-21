# Sicherheit

Lebende Checkliste für die Fussball-Scouting-App. Privacy (Scout-only Daten) und technische Härtung gehören zusammen.

## Bereits umgesetzt

| Thema | Maßnahme |
|---|---|
| Datentrennung | Owner-scoped RLS (`supabase/rls_owner_scoped.sql`), lokaler `ownerScoutId`, Purge fremder IndexedDB-Zeilen |
| Open Redirect | `src/lib/security/safeRedirect.ts` für Login/`next` |
| Import-SSRF | Host-Allowlist `transfermarkt.de` / `fussball.de` (`importHosts.ts`) |
| Import-API Auth | Bearer-Session Pflicht, wenn Supabase konfiguriert (`apiAuth.ts` + `apiFetch`) |
| HTTP-Header | Middleware: `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| Video-Links | nur `http:`/`https:` (`isHttpUrl`) |
| **Content-Security-Policy** | Middleware: `default-src 'self'`, `frame-ancestors 'none'`, `form-action 'self'`; `unsafe-inline` für Theme-Script + Islands (Nonces: Phase 2) |
| **Import-Rate-Limiting** | In-Memory Sliding Window, 30 Req/60 s pro IP (`rateLimit.ts`); `guardImportApi` schützt alle 4 Import-Routen; 429 + `Retry-After`-Header |
| **Private Cache-Header** | Middleware setzt `Cache-Control: private, no-store` für alle geschützten HTML-Navigationen → CDNs/Shared-Caches speichern keine Scout-Daten |
| **Public-Path-Klassifizierung** | `isPublicPath(pathname)` in `src/lib/security/publicPaths.ts` (Login, Auth-Callback, statische Assets) |

## Server-Auth-Gate (Phasen)

### Phase 1 (aktiv)
- Client-seitiger **AuthGate** ist primäres Page-Level-Gate.
- Middleware ergänzt `X-Fusca-Auth: client-gate` + `Cache-Control: private, no-store` auf geschützten HTML-Routen.
- `/api/import/*` werden serverseitig via `guardImportApi` (Bearer + Rate-Limit) geschützt.

### Phase 2 (geplant)
- Supabase-Session in **Cookies** statt LocalStorage speichern (`@supabase/ssr`-Paket), damit die Middleware die Session sehen kann.
- Danach: Middleware-Redirect auf `/login` für unauthentifizierte HTML-Requests auf geschützten Pfaden.
- Bis dahin schützt der ClientGate die Pages zuverlässig (SPA-Routing).

## Ops (manuell)

1. `supabase/rls_owner_scoped.sql` in Supabase ausführen (ersetzt offene SELECT-Policies)
2. Weitere SQL-Migrationen aus README/`docs/PLANNING.md` anwenden
3. Keine Service-Role-Keys im Frontend; nur `PUBLIC_SUPABASE_*` + serverseitige Tokens (`API_FUSSBALL_TOKEN`, …)

## Geplant (nächste Iterationen)

- **CSP-Nonces** für Theme-Inline-Script + Islands (Phase 2 CSP-Hardening)
- Cookie-basiertes SSR Auth-Gate (Phase 2, s.o.)
- Regelmäßige Dependency-Audits (`npm audit`) in CI
- Optional: E2E-Smoke (Login, Offline-Speichern) mit Playwright
- Rate-Limiter auf Redis/Shared-Store für Multi-Instanz-Deployments

## Meldewege

Sicherheitsrelevante Funde bitte privat an die Repo-Owner (kein öffentliches Issue mit Exploit-Details).
