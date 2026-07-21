# Fussball Scouting App – Plan v3

> Stand: Juli 2026 (Abstimmungsrunde 3). Lebende Planungsgrundlage für Feature-Umfang, Datenmodell, Architektur und Tech-Stack.

## 1. Rahmenbedingungen

- **Nutzer:** Ausschließlich Scouts (MVP). Keine Trainer-/Admin-Rollen im ersten Schritt; Datenmodell lässt das später zu.
- **Datentrennung (neu, verbindlich):** Jeder Scout sieht **nur eigene** Beobachtungen – eigene Spieler, Vereine, Spiele und Berichte. Kein gemeinsames Team-Wissen über Account-Grenzen hinweg (Feedback: Testspieler eines Scouts dürfen bei anderen nicht erscheinen).
- **Drei Nutzungskontexte:**
  1. **Spielfeldrand** – schnell, offline, wenige Taps
  2. **Nachbearbeitung Zuhause** – strukturieren, vergleichen, exportieren (Desktop)
  3. **Video-Studium** (z. B. VEO) – zeitgenau, taktisch, Formationen/Phasen
- **Offline:** Zwingend. Sync bei Netz (Push + Pull, owner-scoped).
- **Kamera:** Fotos aus der App; Videos als **externe Links** (VEO o. Ä.), nicht als Rohdatei in Supabase Storage.
- **Budget:** 0 € (GitHub + Vercel Hobby + Supabase Free).
- **Vorgehen:** Iterativ – Privacy zuerst, dann Match-Kontext, Hilfe/Onboarding, Video-Bezug, Feinschliff.

## 2. Tech-Stack (Kurz)

Astro + React-Islands + Tailwind + shadcn (Fusca) · Dexie (lokal) · Supabase (Auth/DB/Storage) · Custom Outbox-Sync · Recharts · jsPDF · Import-Adapter (Transfermarkt, fussball.de, …).

Details und Stolpersteine: unverändert sinnvoll (Storage 1 GB → keine VEO-Rohvideos; Magic Link + Google; manuelle Erfassung bleibt Fallback).

## 2a. Datenimport

Deutsche Amateur-/Jugend über fussball.de / Transfermarkt-Adapter. Dedup **pro Scout** (`owner_scout_id` + externe ID) – derselbe Transfermarkt-Spieler darf bei Scout A und Scout B als **getrennte** Datensätze existieren.

## 3. Datenmodell – Eigentümerschaft

| Entität | Eigentümer-Feld | Sichtbarkeit |
|---|---|---|
| `clubs`, `players`, `matches` | `created_by` / lokal `ownerScoutId` | nur eigener Scout |
| `player_reports`, `team_reports` | `scout_id` | nur eigener Scout |
| `attribute_definitions` | global (Vorlagen) | alle eingeloggten Scouts lesen |
| `media` | über eigenen Bericht | nur eigene |

**RLS:** SELECT/UPDATE/DELETE owner-scoped. Alte Policies „alle Authenticated sehen alles“ werden ersetzt (`supabase/rls_owner_scoped.sql`).

## 4. Sync

- Push: Pending → Supabase (mit `created_by` / `scout_id`)
- Pull: nur Zeilen, die RLS freigibt (= eigene)
- Nach Login/Sync: lokale IndexedDB von **fremden** Datensätzen bereinigen
- Konflikte: LWW; lokale `pending`/`error` nicht überschreiben

## 5. Produktumfang nach Kontext

### Spielfeldrand
- Schlankes Formular: Spieler, Bezug, Raster, Gesamt, kurze Notiz, Foto
- Später: schnelle Formations-Chips / Phasen am Match

### Nachbearbeitung (Desktop)
- Dashboards, Vergleich, PDF/JSON, ausführliche Notizen
- Match-Phasen & Formationen nachpflegen

### Video-Studium
- VEO-/Video-**Link** + Timecode am Spiel/Bericht
- Timeline/Phasen; später optional Event-Import – **keine** automatische Spielernote durch KI

## 6. Meilensteine & Reihenfolge (v3)

| ID | Thema | Status | Inhalt |
|---|---|---|---|
| M0/M1 | Fundament + Team-Berichte | erledigt | Auth, Offline, Formulare, Bezugstyp/Berichtsart |
| M2 | Import | weitgehend | Adapter; Dedup künftig owner-scoped |
| M3 | Sync Push+Pull | weitgehend | Auto-Sync; Retry-UI noch offen |
| **M3.5** | **Datentrennung Scout** | **erledigt (App)** | RLS-SQL ausführen; `ownerScoutId`, Purge, Listen |
| M4 | Dashboards | erledigt (MVP) | Spieler/Team/Vergleich/Verlauf |
| M5 | Export | erledigt | PDF + JSON |
| **M7** | **Match-Phasen & Formationen** | **erledigt (MVP)** | Heim/Gast × off/def, Phasen, Editor am Spiel |
| **M8** | **VEO / Video-Bezug** | geplant | Link + Timecode; später Events; keine Auto-Note |
| **M9** | **Onboarding + FAQ/Tutorial** | **erledigt (MVP)** | First-Run, `/hilfe`, FAQ |
| M6 | Custom-Attribute-UI | später | dynamische Felder |
| M3b | Sync-Retry-UI | parallel/klein | klarere Fehler/Retry |

### Empfohlene Umsetzungsreihenfolge ab jetzt

1. ~~**M3.5 Privacy**~~ – App-seitig erledigt; **`supabase/rls_owner_scoped.sql` in Supabase ausführen**
2. ~~**M9 Onboarding/FAQ**~~ – `/hilfe` + First-Run
3. ~~**M7 Match-Phasen/Formationen**~~ – Editor am Spiel; **`supabase/match_formations.sql` ausführen**
4. **M8 VEO-Link + Timestamp** – Video-Studium
5. M3b Retry-UI, M6 Custom-Felder, Import-Feinschliff

## 7. M7 – Match-Phasen & Formationen

Am **Match** (zusätzlich zur optionalen Kurznotiz `TeamReport.formation`):

- Basis: `formationHeimOff/Def`, `formationGastOff/Def`
- Phasen: `{ id, abMinute, formationHeimOff/Def, formationGastOff/Def, notiz? }[]`
- UI: Chips + Editor im MatchPicker; Zusammenfassung in Berichtsdetails
- SQL: `supabase/match_formations.sql`

## 8. M8 – VEO (Skizze)

- Phase 1: `videoUrl` / `veoRef` + Timestamps in Notizen/Events  
- Phase 2: Event-Import wenn Export/API klar  
- Phase 3 (optional): Assistenz – **nie** automatische Gesamtbewertung  
- Kein Upload von VEO-Rohvideo in Supabase Storage  

## 9. M9 – Onboarding & Hilfe

- Kurzes First-Run-Onboarding (5 Screens): Willkommen → Rand → Sync → Desktop → Privacy  
- Seite `/hilfe`: Sync, Geräte, Privacy („nur deine Daten“), Import, Formulare, FAQ  
- Einführung jederzeit unter Hilfe erneut startbar  
- Einstieg von Übersicht und Sidebar/Mobile-Header

## 10. Entscheidungen Abstimmungsrunde 3

- ✅ Datentrennung: **pro Scout privat**, kein Shared Pool für Stammdaten/Berichte  
- ✅ Nutzungskontexte Rand / Zuhause / Video explizit im Plan  
- ✅ Nächste Features: Privacy → Hilfe → Formationen → VEO-Link  
- ✅ VEO als Link/Bezug, nicht als Storage-fressende Auto-Analyse zuerst  

## 11. Offene Punkte

- VEO: welcher konkrete Export/API-Zugang steht zur Verfügung?
- Sollen „Beobachtungs-Pools“ später bewusst team-geteilt werden können (Opt-in), oder dauerhaft 1:1 Scout↔Daten?
- App-Name / Domain für PWA?
