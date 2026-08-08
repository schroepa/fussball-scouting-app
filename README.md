# Fussball Scouting App

Mobile-first Web-App für Fußball-Scouts: Beobachtungen am Spielfeldrand erfassen, offline weiterarbeiten, am Desktop nachbereiten und auswerten.

Zielgruppe: Scouts im **deutschen Amateur- und Jugendbereich**. Stammdaten lassen sich importieren; Bewertungen und Notizen bleiben privat beim jeweiligen Scout.

In-App-Hilfe unter **`/hilfe`** · Plan: [`docs/PLANNING.md`](docs/PLANNING.md)

---

## Features

### Am Platz
- **Spieler- und Teamberichte** mit Raster (1–10), Gesamtnote, Empfehlung, Freitext, optional Foto
- **Bezug:** Spiel, Training oder sonstige Beobachtung
- **Formationen & Phasen** am Spiel (Heim/Gast × offensiv/defensiv)
- **Video/VEO-Link** und Zeitmarken am Spiel (kein Rohvideo-Upload)
- Offline-fähig (PWA / IndexedDB)

### Zuhause (Desktop)
- Sidebar-Arbeitsplatz, Dashboards, Filter, Spielervergleich
- Import (Transfermarkt, fussball.de, TheSportsDB, Namensliste)
- PDF- und JSON-Export
- Eigene **Bewertungsfelder** (Spieler & Team)
- Dark Mode (persistiert)

### Privacy & Sync
- **Nur eigene Daten** pro Scout (`ownerScoutId` + RLS)
- Outbox-Sync mit Status, Retry bei Fehlern
- Google-Login oder Magic Link (Supabase)

---

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | Astro 7 + React Islands + Tailwind CSS 4 + shadcn (Fusca) |
| Offline / PWA | Dexie (IndexedDB), `@vite-pwa/astro` |
| Backend / Auth | Supabase (Postgres, Auth, Storage) |
| Schema | Drizzle ORM |
| Export | jsPDF |
| Hosting | Vercel (`@astrojs/vercel`) |

Weitere Docs: [`docs/PLANNING.md`](docs/PLANNING.md) · [`docs/RADIUS.md`](docs/RADIUS.md)

---

## Schnellstart

Voraussetzung: **Node.js ≥ 22.12**

```bash
git clone https://github.com/schroepa/fussball-scouting-app.git
cd fussball-scouting-app
npm install
npm run dev
```

App: [http://localhost:4321](http://localhost:4321)

| Befehl | Zweck |
|--------|--------|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktionsbuild |
| `npm run preview` | Build lokal prüfen (inkl. PWA) |

**Ohne Supabase:** reiner Lokal-Modus (Erfassung, Kamera, Export). Login und geräteübergreifender Sync sind dann aus.

---

## Umgebungsvariablen

`.env` aus [`.env.example`](.env.example):

| Variable | Pflicht? | Beschreibung |
|----------|----------|--------------|
| `PUBLIC_SUPABASE_URL` | für Login/Sync | Supabase-Projekt-URL |
| `PUBLIC_SUPABASE_ANON_KEY` | für Login/Sync | Anon / Publishable Key |
| `SUPABASE_DB_URL` | nur Migrationen | DB-URL (nie `PUBLIC_`, nie committen) |
| `THESPORTSDB_API_KEY` | optional | Default-Hobby-Key `123` |
| `API_FUSSBALL_TOKEN` | optional | [api-fussball.de](https://api-fussball.de) |
| `SPORTDB_API_KEY` | optional | [sportdb.dev](https://sportdb.dev) |

---

## Supabase (Login & Sync)

1. Projekt auf [supabase.com](https://supabase.com) anlegen.
2. **Auth → Providers:** Google OAuth; Redirects in Google Cloud + Supabase setzen (`/auth/callback`).
3. **SQL Editor:** zuerst [`supabase/setup.sql`](supabase/setup.sql), danach die Ops-Skripte unten.
4. `PUBLIC_SUPABASE_*` in `.env` / Vercel setzen.

Mit konfiguriertem Supabase ist Login Pflicht.

```bash
npm run db:generate   # Migration aus drizzle/schema.ts
npm run db:push       # Schema pushen (braucht SUPABASE_DB_URL)
npm run db:studio     # Drizzle Studio
```

### Wichtig nach jedem Deploy (SQL)

Im Supabase SQL-Editor ausführen:

1. [`supabase/rls_owner_scoped.sql`](supabase/rls_owner_scoped.sql) – Datentrennung pro Scout  
2. [`supabase/match_formations.sql`](supabase/match_formations.sql) – Formationen/Phasen  
3. [`supabase/match_video.sql`](supabase/match_video.sql) – Video-Link/Marken  
4. [`supabase/attribute_definitions_owner.sql`](supabase/attribute_definitions_owner.sql) – Custom-Bewertungsfelder  
5. [`supabase/trainer_v1.sql`](supabase/trainer_v1.sql) – Trainerbereich V1  
6. [`supabase/trainer_v2.sql`](supabase/trainer_v2.sql) – Matching, Sequenzen, Spiel-Teilnahmen  

Ohne diese Skripte können Sync, Privacy oder neue Match-Felder fehlschlagen.

---

## Import

Unter **`/import`**:

1. **Transfermarkt** – Vereins-/Jugend-URL → Kader (Name, Position, Geburtsdatum)  
2. **fussball.de** – Verein/Teams; Kader oft gesperrt → Namensliste  
3. **Spieler** – TheSportsDB (eher bekannte Namen)  
4. **API** – fussball.de API (braucht `API_FUSSBALL_TOKEN`)

Deduplizierung **pro Scout** (`ownerScoutId` + externe Quelle/ID).

---

## Hilfe in der App

- Seite **`/hilfe`**: Themen zu Sync, Privacy, Berichten, Import, Formationen, Video, Dashboard, FAQ  
- **Einführung** (First-Run) jederzeit unter Hilfe erneut startbar  
- Kurzlinks von der Übersicht und aus der Navigation  

---

## Deployment (Vercel)

1. Repo verbinden (`@astrojs/vercel` ist vorkonfiguriert).  
2. Env-Vars setzen (mindestens `PUBLIC_SUPABASE_*`).  
3. Produktiv-Redirects in Supabase/Google: `https://<domain>/auth/callback`

---

## Projektstruktur

```
src/
  components/     React-Islands (Formulare, Import, Hilfe, Sync, …)
  layouts/        App-Shell, Navigation, PWA
  lib/
    help/         Hilfe- & Onboarding-Texte
    local/        Dexie / Repository
    import/       Adapter + Persistenz
    sync/         Outbox-Sync
    security/     Redirect-/Import-Härtung (je nach Branch)
    dashboard/    Aggregationen
  pages/          Routen inkl. /hilfe, /import, /api/import/*
docs/             PLANNING, RADIUS, …
supabase/         setup.sql + Ops-Migrationen
```

---

## Status (Kurz)

| Thema | Stand |
|-------|--------|
| Offline-Erfassung, Auth, Export | erledigt |
| Import + Dedup pro Scout | erledigt |
| Sync + Retry-UI | erledigt (App) |
| Datentrennung Scout | erledigt (App) – RLS-SQL ausführen |
| Dashboard / Vergleich | erledigt |
| Formationen, VEO-Link, Custom-Felder | erledigt (SQL ausführen) |
| Onboarding + Hilfe | erledigt |
| Berichte bearbeiten | erledigt (`/reports/.../edit`) |
| UI-Radien (max. 16px außen) | erledigt – `docs/RADIUS.md` |
| Qualität / Security / Tests | erledigt (Vitest + Playwright-Smoke, CSP, Rate-Limit) |
| Trainerbereich V1 | erledigt (App) – `trainer_v1.sql` ausführen; Details `docs/TRAINERBEREICH.md` |
| Trainerbereich V2 | erledigt (App) – `trainer_v2.sql` ausführen; Details `docs/TRAINERBEREICH_V2.md` |

Ausführlich: [`docs/PLANNING.md`](docs/PLANNING.md).

### Qualität, Tests, Security

- Unit-Tests: `npm test` (Vitest)
- E2E-Smoke: `npm run test:e2e` (Playwright)
- CI: `.github/workflows/ci.yml`
- Konventionen: `docs/CONVENTIONS.md` · Radien: `docs/RADIUS.md`
- Security: `docs/SECURITY.md`

---

## Lizenz & Hinweise

Privates Scouting-Tool. Datenquellen (Transfermarkt, fussball.de, …) unterliegen deren Nutzungsbedingungen – Importe nur für den eigenen Workflow, sparsam anfragen.

Beiträge und Feedback über Issues oder Pull Requests.
