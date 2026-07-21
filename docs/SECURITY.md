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

## Ops (manuell)

1. `supabase/rls_owner_scoped.sql` in Supabase ausführen (ersetzt offene SELECT-Policies)
2. Weitere SQL-Migrationen aus README/`docs/PLANNING.md` anwenden
3. Keine Service-Role-Keys im Frontend; nur `PUBLIC_SUPABASE_*` + serverseitige Tokens (`API_FUSSBALL_TOKEN`, …)

## Geplant (nächste Iterationen)

- Strikte **Content-Security-Policy** (Nonces für Theme-Inline-Script + Islands)
- Rate-Limiting / Abuse-Schutz für Import-APIs
- Server-seitiges Auth-Gate (Astro Middleware) zusätzlich zum Client-`AuthGate`
- Regelmäßige Dependency-Audits (`npm audit`) in CI
- Optional: E2E-Smoke (Login, Offline-Speichern) mit Playwright

## Meldewege

Sicherheitsrelevante Funde bitte privat an die Repo-Owner (kein öffentliches Issue mit Exploit-Details).
