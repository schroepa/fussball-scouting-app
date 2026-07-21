# Fussball Scouting App

Mobile-first Web-App für Fußball-Scouts: Spieler und Teams am Spielfeldrand bewerten, offline weiterarbeiten und Berichte als PDF/JSON exportieren.

Zielgruppe sind Scouts im **deutschen Amateur- und Jugendbereich**. Stammdaten können von Transfermarkt, fussball.de und TheSportsDB importiert werden; eigene Notizen und Bewertungen bleiben im Mittelpunkt.

---

## Features

### Scouting am Platz
- **Spielerberichte** mit Bewertungsraster (Technik, Taktik, Athletik, Mentalität, 1–10), Gesamtnote, Empfehlung und Freitext
- **Teamberichte** als Gegner-Analyse oder Einschätzung des eigenen Teams
- **Bezugstyp** je Beobachtung: Spiel, Training oder sonstige Beobachtung
- **Kamera-Foto** direkt im Bericht (PWA)
- Klare Listen- und Detailansichten mit Badges

### Offline-first
- Alle Erfassungen laufen lokal in **IndexedDB** (Dexie)
- Ohne Netz weiter scoutingfähig
- Sync nach Supabase, sobald Verbindung und Login vorhanden sind

### Import von Stammdaten
| Quelle | Wofür | Hinweis |
|--------|--------|---------|
| **Transfermarkt** | Jugend- und Vereinsskader (Name, Position, Geburtsdatum) | Empfohlen für U-Teams |
| **fussball.de** | Mannschaften, ggf. öffentliche Kader | Jugendkader oft gesperrt → Namensliste-Fallback |
| **TheSportsDB** | Bekannte Spieler/Vereine suchen | Eher Profi-/bekannte Namen |
| **Manuell** | Spieler selbst anlegen oder Namensliste einfügen | Immer verfügbar |

### Export & Sync
- PDF- und JSON-Export pro Bericht
- Google-Login oder Magic Link (Supabase)
- Outbox-Sync: lokale Änderungen werden nachgezogen

---

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | [Astro 7](https://astro.build) + React Islands + Tailwind CSS 4 |
| Offline / PWA | Dexie (IndexedDB), `@vite-pwa/astro` |
| Backend / Auth | [Supabase](https://supabase.com) (Postgres, Auth, Storage) – Free Tier |
| Schema | [Drizzle ORM](https://orm.drizzle.team) |
| Export | jsPDF |
| Hosting | [Vercel](https://vercel.com) (`@astrojs/vercel`) |

Architektur und Meilensteine: Branch `cursor/scouting-app-planning-0911` → `docs/PLANNING.md`.

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

**Ohne Supabase** läuft die App im Lokal-Modus: Spieler, Vereine, Berichte, Kamera und Export funktionieren. Login und geräteübergreifender Sync sind dann deaktiviert.

PWA (Service Worker) nur im Produktions-Build:

```bash
npm run build && npm run preview
```

---

## Umgebungsvariablen

`.env` aus `.env.example` anlegen:

| Variable | Pflicht? | Beschreibung |
|----------|----------|--------------|
| `PUBLIC_SUPABASE_URL` | für Login/Sync | Supabase-Projekt-URL |
| `PUBLIC_SUPABASE_ANON_KEY` | für Login/Sync | Publishable / Anon Key |
| `SUPABASE_DB_URL` | nur Migrationen | DB-Connection (nie `PUBLIC_`, nie committen) |
| `THESPORTSDB_API_KEY` | optional | Default-Hobby-Key `123` |
| `API_FUSSBALL_TOKEN` | optional | Token von [api-fussball.de](https://api-fussball.de) |
| `SPORTDB_API_KEY` | optional | Key von [sportdb.dev](https://sportdb.dev) (Transfermarkt-Proxy) |

---

## Supabase (Login & Sync)

1. Projekt auf [supabase.com](https://supabase.com) anlegen (Free Tier reicht).
2. **Authentication → Providers:** Google OAuth aktivieren; Client-ID/Secret aus der [Google Cloud Console](https://console.cloud.google.com/auth/clients).
3. **URL Configuration:** Site URL z. B. `http://localhost:4321`, Redirect `http://localhost:4321/auth/callback`.
4. In Google Cloud als Redirect-URI eintragen:  
   `https://<project-ref>.supabase.co/auth/v1/callback`
5. Im **SQL Editor** den Inhalt von [`supabase/setup.sql`](supabase/setup.sql) ausführen (Tabellen, Auth-Trigger, RLS).
6. `PUBLIC_SUPABASE_URL` und `PUBLIC_SUPABASE_ANON_KEY` in `.env` setzen.

Mit konfiguriertem Supabase ist Login Pflicht. Ohne Konfiguration bleibt der reine Offline-Modus.

Schema-Änderungen:

```bash
npm run db:generate   # Migration aus drizzle/schema.ts
npm run db:push       # Schema direkt pushen (braucht SUPABASE_DB_URL)
npm run db:studio     # Drizzle Studio
```

RLS-Policies: [`supabase/policies.sql`](supabase/policies.sql)

---

## Import nutzen

Unter **`/import`**:

1. **Transfermarkt** – Vereins-URL einfügen, z. B.  
   `https://www.transfermarkt.de/bfc-dynamo-u17/startseite/verein/35633`  
   → Kader mit Namen, Positionen und Geburtsdaten übernehmen.
2. **fussball.de** – Vereins-URL → Mannschaften; Kader nur wenn öffentlich freigegeben.
3. **Spieler suchen** – TheSportsDB für bekannte Namen.
4. **Namensliste** – eine Zeile pro Spieler (`Nachname, Vorname` oder `Vorname Nachname`), wenn keine Quelle liefert.

Deduplizierung über `external_source` + `external_ref`.

---

## Deployment (Vercel)

1. Repo mit Vercel verbinden (Adapter `@astrojs/vercel` ist vorkonfiguriert).
2. Environment Variables aus `.env.example` setzen (mindestens Supabase-Public-Keys).
3. In Supabase und Google Cloud die Produktiv-Domain als Redirect hinterlegen:  
   `https://<deine-domain>/auth/callback`

> Vercel Hobby ist für private/nicht-kommerzielle Nutzung gedacht. Für bezahlten Vereinseinsatz den Pro-Plan prüfen.

---

## Projektstruktur

```
src/
  components/     React-Islands (Formulare, Import, Kamera, Sync)
  layouts/        App-Layout, Navigation, PWA
  lib/
    local/        Dexie / IndexedDB, Repository
    import/       Transfermarkt, fussball.de, TheSportsDB, Persistenz
    sync/         Outbox-Sync nach Supabase
    export/       PDF- und JSON-Export
    auth/         Session / Login
    supabase/     Client
  pages/          Routen (Berichte, Spieler, Vereine, Import, API)
drizzle/
  schema.ts       Datenbankschema
supabase/
  setup.sql       Einmal-Setup (Tabellen + RLS)
  migrations/     Generierte Migrationen
  policies.sql    Row-Level-Security
```

---

## Status

| Meilenstein | Stand |
|-------------|--------|
| M0/M1 – Scaffold, Offline-DB, Berichte, Auth, Export | erledigt |
| M2 – Import (Transfermarkt, fussball.de, TheSportsDB) | weitgehend |
| M3 – Sync Push + Pull (Geräte) | weitgehend |
| **M3.5 – Datentrennung pro Scout** | **erledigt (App)** – RLS-SQL in Supabase ausführen |
| M4 – Dashboards & Spielervergleich | erledigt (MVP) |
| M5 – Export PDF/JSON | erledigt |
| M7 – Match-Phasen & Formationen | **erledigt (MVP)** – SQL `match_formations.sql` ausführen |
| M8 – VEO/Video-Link + Timecode | geplant |
| **M9 – Onboarding + FAQ/Hilfe** | **erledigt (MVP)** – `/hilfe`, First-Run |
| M6 – UI für Custom-Bewertungsfelder | offen |

Aktueller Plan: `docs/PLANNING.md` (v3).

### Wichtig nach Deploy (Privacy + Formationen)

Im Supabase SQL-Editor ausführen:

1. `supabase/rls_owner_scoped.sql` – Datentrennung pro Scout  
2. `supabase/match_formations.sql` – Formations-/Phasen-Spalten am Match

Sonst können Sync bzw. Formations-Push fehlschlagen bzw. fremde Daten sichtbar bleiben.

---

## Lizenz & Hinweise

Privates Scouting-Tool. Datenquellen (Transfermarkt, fussball.de, …) unterliegen deren Nutzungsbedingungen – Importe nur für den eigenen Scout-Workflow, höflich und sparsam anfragen.

Beiträge und Feedback gerne über Issues oder Pull Requests.
