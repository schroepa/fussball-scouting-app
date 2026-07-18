# ⚽ Fussball Scouting App

Mobile-first, **offline-fähige** Web-App für Fußball-Scouts zur Erfassung von
Spieler- und Team-Daten direkt am Spielfeldrand.

Der vollständige Feature- und Architektur-Plan (inkl. Meilensteinen) steht in
[`docs/PLANNING.md`](docs/PLANNING.md). Dieses README beschreibt, wie das
Projekt lokal eingerichtet, entwickelt und deployed wird.

## Tech-Stack

- **[Astro 7](https://astro.build)** mit React-Islands (`@astrojs/react`) und
  Tailwind CSS
- **PWA/Offline**: [`@vite-pwa/astro`](https://vite-pwa-org.netlify.app/frameworks/astro)
  (Service Worker, Web-App-Manifest)
- **Lokale Datenhaltung**: [Dexie.js](https://dexie.org) (IndexedDB) – die App
  funktioniert dadurch vollständig ohne Internetverbindung
- **Zentrale Datenbank**: [Supabase](https://supabase.com) (Postgres + Auth +
  Storage), Free Tier
- **ORM**: [Drizzle](https://orm.drizzle.team) für das Datenbankschema
- **PDF-Export**: [jsPDF](https://github.com/parallax/jsPDF)
- **Hosting**: GitHub + [Vercel](https://vercel.com) (`@astrojs/vercel`-Adapter)

Alle Entscheidungen und Begründungen dazu stehen in
[`docs/PLANNING.md`](docs/PLANNING.md).

## Lokal starten (funktioniert auch ohne Supabase-Setup)

```bash
npm install
npm run dev
```

Die App ist dann unter `http://localhost:4321` erreichbar. **Ohne
Supabase-Konfiguration läuft die App im reinen Lokal-Modus**: Erfassung von
Spielern, Vereinen und Berichten funktioniert vollständig (inkl. Kamera und
PDF/JSON-Export), nur Login und Synchronisation über mehrere Geräte hinweg
sind deaktiviert.

> PWA-Funktionen (Service Worker/Offline-Cache) sind nur im Produktions-Build
> aktiv. Zum Testen: `npm run build && npm run preview`.

## Supabase einrichten (für Login & Synchronisation)

1. Kostenloses Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Unter **Authentication → Sign In / Providers**: Google-OAuth aktivieren
   (Client-ID/Secret aus der [Google Cloud Console](https://console.cloud.google.com/auth/clients)
   eintragen). Unter **URL Configuration**: Site URL z. B. `http://localhost:4321`,
   Redirect URL `http://localhost:4321/auth/callback`. In Google Cloud muss als
   Weiterleitungs-URI die Supabase-Callback-URL stehen:
   `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Tabellen + Policies einmalig anlegen:** Im Supabase-Dashboard →
   **SQL Editor** den kompletten Inhalt von
   [`supabase/setup.sql`](supabase/setup.sql) einfügen und **Run** klicken.
   (Das erzeugt alle Tabellen, den Auth-Trigger und die Row-Level-Security.)
4. `.env` aus `.env.example` erstellen und `PUBLIC_SUPABASE_URL` /
   `PUBLIC_SUPABASE_ANON_KEY` eintragen (Publishable Key reicht).
5. Optional später: Storage-Bucket `report-media` für Foto-Upload beim Sync.

Sobald Supabase konfiguriert ist, erfordert die App einen Login (Google oder
Magic Link). Ohne Konfiguration bleibt der reine Lokal-Modus möglich.

## Datenbankschema ändern

Das Schema wird zentral in [`drizzle/schema.ts`](drizzle/schema.ts) gepflegt.

```bash
npm run db:generate   # erzeugt eine neue SQL-Migration in supabase/migrations/
npm run db:push        # wendet das Schema direkt auf die Supabase-DB an (SUPABASE_DB_URL nötig)
npm run db:studio      # öffnet Drizzle Studio zum Durchsuchen der Daten
```

RLS-Policies werden bewusst getrennt in [`supabase/policies.sql`](supabase/policies.sql)
gepflegt (siehe Kommentar dort für die Sicherheitslogik).

## Deployment auf Vercel

1. Repository auf GitHub pushen (bereits erledigt, falls du dieses README liest).
2. Auf [vercel.com](https://vercel.com) ein neues Projekt aus dem Repo
   anlegen – der `@astrojs/vercel`-Adapter wird automatisch erkannt.
3. Unter **Project Settings → Environment Variables** die Variablen aus
   `.env.example` eintragen (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`).
4. In der Google Cloud Console und in Supabase Auth die Vercel-Domain als
   Redirect-URL (`https://<deine-domain>/auth/callback`) hinterlegen.

> **Hinweis:** Der Vercel-**Hobby**-Plan ist laut Nutzungsbedingungen nur für
> nicht-kommerzielle, private Nutzung gedacht. Für ein privates Testprojekt
> passt das; bei kommerzieller Nutzung (z. B. bezahlter Verein) wäre der
> Pro-Plan nötig. Details in `docs/PLANNING.md`.

## Projektstruktur

```
src/
  components/     React-Islands (Formulare, Listen, Badges, Kamera, Sync-Status)
  layouts/        Astro-Layout (Navigation, PWA-Registrierung)
  lib/
    types.ts                 Zentrale Domänen-Typen
    attributeDefinitions.ts  MVP-Bewertungsraster (Seed-Daten)
    local/                   Dexie/IndexedDB (Offline-Speicherung, Repository-Funktionen)
    supabase/                Supabase-Client
    auth/                    Session-/Login-Verwaltung
    sync/                    Outbox-Sync-Manager
    export/                  PDF- und JSON-Export
  pages/          Astro-Seiten/Routen
drizzle/
  schema.ts       Datenbankschema (Referenz für Migrationen)
supabase/
  migrations/     Generierte SQL-Migrationen
  policies.sql    Row-Level-Security-Policies (manuell im SQL-Editor ausführen)
docs/
  PLANNING.md     Feature-Plan, Datenmodell, Meilensteine
```

## Aktueller Stand

Bereits umgesetzt (M0 + M1 + Basis-Export, siehe `docs/PLANNING.md`):

- [x] Projekt-Setup: Astro + Tailwind + React-Islands, Vercel-Adapter, PWA
- [x] Lokale Datenhaltung (Dexie/IndexedDB) – App funktioniert vollständig offline
- [x] Login (Google OAuth + Magic Link) – bei konfiguriertem Supabase Pflicht-Login + Logout
- [x] Spieler-Scouting-Formular mit MVP-Bewertungsraster, Kamera-Foto,
      Bezugstyp (Spiel/Training/sonstige Beobachtung)
- [x] Team-Scouting-Formular (Gegner-Analyse vs. eigenes Team), gleiche
      Bezugstyp-Logik
- [x] Liste & Detailansicht mit klar erkennbaren Badges
- [x] Manueller Sync-Button + einfacher automatischer Sync bei Wiederverbindung
- [x] PDF- und JSON-Export je Bericht
- [x] Drizzle-Schema + generierte SQL-Migration + RLS-Policies für Supabase

### Datenimport (M2 – teilweise)

- [x] Seite **Import** (`/import`): Spieler/Vereine über TheSportsDB suchen und übernehmen
- [x] **Jugend/Kader-Scraper** (kein Token): Vereins-URL → Mannschaften (inkl. Jugend) → öffentliche Kaderlisten von fussball.de; Namensliste als Fallback
- [x] fussball.de-Verein + Spiele via `api-fussball.de` (benötigt `API_FUSSBALL_TOKEN`; Dienst oft offline)
- [x] Deduplizierung über `external_source` + `external_ref`
- [x] Manuelle Spieler-Anlage unter **Spieler**
- Hinweis: Viele Jugend-Kader sind auf fussball.de **nicht freigegeben**. Der Scraper meldet das und bietet eine Namensliste (eine Zeile pro Spieler) als Fallback.

Noch offen:

- [ ] M3: robusterer Offline-Sync (Konfliktbehandlung, Retry-UI, Pull vom Server)
- [ ] M4: Dashboards mit Filtern & Spieler-Vergleich
- [ ] M6: UI zum Anlegen eigener Bewertungs-/Custom-Felder
