# Fussball Scouting App – Plan v2

> Stand: Juli 2026 (Abstimmungsrunde 2). Dieses Dokument ist die lebende Planungsgrundlage für Feature-Umfang, Datenmodell, Architektur und Tech-Stack. Es wird im Projektverlauf laufend erweitert/angepasst.

## 1. Rahmenbedingungen (Ausgangslage)

- **Nutzer:** Ausschließlich Scouts (MVP). Keine Trainer-/Admin-Rollen im ersten Schritt, aber Datenmodell soll das später zulassen.
- **Nutzung:** Mobile-first Web-App, primär am Spielfeldrand per Smartphone genutzt.
- **Offline:** Zwingend erforderlich. Erfassung muss ohne Netz funktionieren, Synchronisation erfolgt sobald wieder Netz verfügbar ist.
- **Kamera:** Direkter Zugriff aus der App zum Fotografieren (Spieler, Aufstellung, Szenen).
- **Datenumfang:** Möglichst vollständige Erfassung zu Spielern und Teams (Basis-Set + jederzeit erweiterbar um neue Felder, ohne Code-Redeploy).
- **Analysearten:** Spieler-Scouting, Gegner-Analyse, Analyse des eigenen/beobachteten Teams.
- **Datenimport:** Basisdaten (Vereine, Spieler, Spiele) sollen über eine kostenlose API importierbar sein, inkl. Deduplizierung (derselbe Spieler/Verein wird nicht doppelt angelegt).
- **Auswertung:** Feingranulare Dashboards zu Spielern und Teams.
- **Export:** PDF (menschenlesbarer Bericht) und JSON (maschinenlesbar, für Weiterverarbeitung in anderen Tools).
- **Budget:** 0 €. Alles muss auf kostenlosen Tiers laufen (GitHub + Vercel + kostenlose Zusatzdienste).
- **Vorgehen:** Iterativ – MVP zuerst, danach Feature für Feature erweitern.

## 2. Tech-Stack – Empfehlung & Begründung

| Bereich | Wahl | Warum |
|---|---|---|
| Framework | **Astro 5** (dein Wunsch) mit SSR-Adapter `@astrojs/vercel` | Schnelle, schlanke Seiten (App-Shell), SSR-Endpunkte als API-Routen (z. B. um API-Keys serverseitig zu verstecken) |
| Interaktive UI | **React**-Islands (`@astrojs/react`) für Formulare, Kamera, Dashboards | Größtes Ökosystem für exakt die Bausteine, die wir brauchen (Forms, Charts, PDF, Offline-Hooks) – spart Eigenentwicklung |
| Styling | **Tailwind CSS** | Schnelles, konsistentes Mobile-First-Styling |
| Offline-App-Shell (PWA) | **`@vite-pwa/astro`** (Workbox-basiert) | Offizielle, aktiv gepflegte Astro-Integration; generiert Service Worker, Web-App-Manifest, Offline-Caching der App automatisch |
| Lokale Datenhaltung (Gerät) | **Dexie.js** (Wrapper um IndexedDB) | Simple, bewährte "Datei-artige" lokale DB im Browser – erfüllt deinen Wunsch nach einer schlanken, lokalen Speicherung ohne Server |
| Sync-Mechanismus | **Custom Outbox-Pattern** (Details siehe Abschnitt 4) | Für unseren Fall (i. d. R. 1 Scout = 1 Bericht, selten echte Konflikte) reicht ein schlanker, selbstgebauter Sync – volle Kontrolle, kein Vendor-Lock-in, keine zusätzlichen Kosten |
| Zentrale Datenbank | **Supabase (Postgres)**, Free Tier | Bündelt DB + Auth + Storage + Realtime + Auto-REST-API in *einem* kostenlosen Dienst – reduziert Komplexität stark gegenüber "SQLite-Datei + separater Auth-Anbieter + separater Storage-Anbieter" |
| ORM | **Drizzle ORM** | Typsicher, leichtgewichtig, sehr gut geeignet für Vercel/Edge-Functions |
| Auth | **Supabase Auth**: Google OAuth + E-Mail Magic Link | Google-Login ist kostenlos; s. Hinweis zu Apple unten |
| Foto/Video-Speicher | **Supabase Storage** (im Free Tier enthalten) | Kein separater Dienst nötig; Row-Level-Security direkt integrierbar |
| Externe Fußball-Daten-API | **fussball.de-Daten** (Ligen, Vereine, Mannschaften, Spielpläne, Logos) über eine **Import-Adapter-Schicht** | Deutsche Amateur- und Jugendligen (Kreis-/Bezirks-/Landes-/Verbandsliga sowie A- bis F-Junioren) werden ausschließlich über **fussball.de** (DFBnet) abgebildet – es gibt aber **keine offizielle öffentliche API**. Details und Alternativen s. Abschnitt 2a. |
| PDF-Export | **jsPDF** (+ `jspdf-autotable`) | Läuft komplett im Browser/Client – funktioniert auch offline, kein Server-Rendering (z. B. Puppeteer) nötig |
| JSON-Export | Nativ (eigene Serialisierung) | Kein Zusatzdienst nötig |
| Dashboards/Charts | **Recharts** oder **Chart.js** | Kostenlos, leichtgewichtig, React-kompatibel |
| Hosting | **GitHub** (Repo/CI) + **Vercel** (Deployment) | Wie gewünscht; offizieller Astro-Vercel-Adapter |

### Wichtige Hinweise / Stolpersteine (bitte bewusst entscheiden)

1. **"Datenbank als einzelne Datei"**: Eine echte Einzeldatei-DB (SQLite) ist super für die *lokale* Speicherung auf dem Gerät (das machen wir mit IndexedDB/Dexie – im Grunde dasselbe Prinzip: eine lokale, private Datenablage pro Gerät). Für die *zentrale* Datenbank, auf die mehrere Scouts gleichzeitig übers Netz schreiben, ist SQLite aber ungeeignet (kein robustes Multi-Writer-Handling über Netzwerk). Daher: zentral **Postgres via Supabase**, lokal **IndexedDB** – das gibt dir das Beste aus beiden Welten.
2. **Apple Sign-In kostet Geld**: "Sign in with Apple" setzt eine Mitgliedschaft im Apple Developer Program voraus (99 $/Jahr) – das widerspricht dem 0-€-Budget. Empfehlung: Start mit **Google-Login + E-Mail Magic Link**, Apple-Login als späteres optionales Feature, falls doch Budget verfügbar ist.
3. **Supabase Free Tier pausiert nach 7 Tagen Inaktivität.** Lösung: ein kostenloser GitHub-Actions-Cron-Job, der z. B. 1×/Woche einen Health-Check-Endpoint aufruft und damit das Projekt "wach" hält.
4. **Supabase Storage Free Tier = nur 1 GB.** Für Fotos gut ausreichend, für **Videos** wird das schnell knapp. Empfehlung: MVP nur mit Fotos arbeiten; Videos später entweder stark komprimiert/kurz halten oder als externe Links (z. B. unlisted YouTube) im Bericht verlinken statt Rohdateien zu speichern.
5. **Vercel Hobby-Plan ist laut Nutzungsbedingungen nur für nicht-kommerzielle, private Projekte gedacht.** Für ein privates/Testprojekt oder einen Prototyp ist das kein Problem. Falls die App später für einen Verein im kommerziellen Kontext (bezahlte Nutzung) läuft, wäre formal der Pro-Plan (ca. 20 $/Monat) nötig – das sollten wir im Hinterkopf behalten, ist aber aktuell kein Blocker.
6. **Datenimport-APIs sind nie vollständig kostenlos *und* vollständig.** Insbesondere für deutsche Amateur-/Jugendligen gibt es keine offizielle API (s. Abschnitt 2a) – manuelle Erfassung MUSS also immer als verlässliche Basis funktionieren, API-Import ist "nur" ein Komfort-Feature, das die manuelle Arbeit reduziert, wo möglich.

## 2a. Datenimport: Deutsche Amateur- und Jugendligen (Entscheidung)

**Anforderung:** API für deutsche Amateur- und Jugendligen; ausländische Ligen erstmal out of scope, aber später ergänzbar.

**Rechercheergebnis:** Der deutsche Amateur- und Jugendfußball (Kreisliga bis Landes-/Verbandsliga, sowie A- bis F-Junioren/-innen) wird zu 100 % über **fussball.de** (Frontend des DFBnet, betrieben vom DFB und seinen 21 Landesverbänden) abgebildet. **fussball.de bietet jedoch keine offizielle, öffentliche Entwickler-API** – trotz jahrelanger Nachfrage in der Community. Es gibt nur:

- Offizielle **iframe-Widgets** (für einzelne Vereine/Mannschaften, aber kein programmatischer Datenzugriff)
- Mehrere **inoffizielle, community-betriebene JSON-Schnittstellen**, die fussball.de crawlen, z. B. **api-fussball.de** (aktuell kostenlos, liefert Vereine/Mannschaften/Tabellen/Spiele inkl. Logos für alle Mannschaftsarten wie A-Junioren bis F-Junioren, Frauen, Juniorinnen)
- Offene Scraper-Bibliotheken auf GitHub (z. B. `iste2/Fu-ball.de-REST-API`), die man selbst hosten könnte

**Empfehlung für das MVP/M2:**
- Import-Feature gegen **api-fussball.de** aufbauen (kostenlos, liefert genau die benötigten Daten: Vereine, Mannschaften/"Ligen", Spielpläne, Logos – inkl. Jugendmannschaften)
- **Wichtiger Vorbehalt:** Dies ist ein **inoffizieller Drittanbieter-Crawler**, kein offizieller DFB-Dienst. Es gibt keine Verfügbarkeits-Garantie, die Struktur von fussball.de könnte sich ändern und den Crawler brechen, und die Nutzung bewegt sich in einer rechtlichen Grauzone (Scraping der Nutzerdaten von fussball.de). Für ein privates/nicht-kommerzielles Scouting-Tool ist das ein vertretbares Risiko, sollte aber bewusst in Kauf genommen werden.
- **Fallback-Strategie:** Da manuelle Erfassung ohnehin immer möglich sein muss, ist der Import rein additiv – fällt die Quelle aus, funktioniert die App unverändert weiter (nur ohne Automatik beim Anlegen neuer Vereine/Spieler).
- **Architektur:** Der Import läuft über eine generische **`ImportProvider`-Schnittstelle** (ein Adapter pro Datenquelle: `FussballDeProvider` jetzt, später z. B. `FootballDataOrgProvider` oder `ApiFootballProvider` für ausländische Ligen). So lässt sich "ausländische Ligen später hinzufügen" umsetzen, ohne den Kern der App zu verändern – es kommt einfach ein weiterer Adapter hinzu, den der Scout beim Import als Quelle auswählen kann.

## 3. Datenmodell (Skizze, bewusst erweiterbar)

Kernidee zur **Erweiterbarkeit** (Punkt 2/3 aus deinen Antworten): Neben festen Kernfeldern bekommt jede Haupt-Entität ein `custom_fields`-JSON-Feld. Zusätzlich gibt es eine Tabelle `attribute_definitions`, mit der neue Bewertungs-Kategorien/Felder *ohne Code-Änderung* über die UI angelegt werden können (z. B. neue Bewertungsskala "Spielübersicht" für Spieler). Formulare, Dashboards und Exporte lesen diese Definitionen dynamisch aus.

- **club** – id, name, land, liga, logo_url, external_ref (Quelle+ID der API, für Dedup), custom_fields
- **player** – id, vorname, nachname, geburtsdatum, nationalität, position(en), starker_fuß, größe, aktueller_club_id, foto_url, external_ref, custom_fields
- **match** – id, heim_club_id, gast_club_id, wettbewerb, datum, spielort, external_ref
- **player_report** (Spieler-Scouting-Bericht) – id, player_id, scout_id, **bezugstyp** (`spiel` | `training` | `sonstige_beobachtung`), match_id (nur bei `bezugstyp = spiel`, sonst leer), datum, position_beobachtet, ratings (JSON: Kategorie → Wert), stärken, schwächen, freitext_notizen, gesamtbewertung, empfehlung, tags, custom_fields, sync_status, client_uuid, updated_at
- **team_report** (Team-/Gegner-Analyse **oder** Analyse des eigenen/beobachteten Teams) – id, club_id, **berichtsart** (`gegner_analyse` | `eigenes_team`), **bezugstyp** (`spiel` | `training` | `sonstige_beobachtung`), match_id (nur bei `bezugstyp = spiel`), formation, spielstil, standardsituationen, stärken, schwächen, schlüsselspieler (Referenzen zu player), custom_fields, scout_id, sync_status, client_uuid, updated_at

> **Klare Trennung/Erkennbarkeit (wichtig):** `bezugstyp` (Spiel vs. Training vs. sonstige Beobachtung) und bei Team-Berichten zusätzlich `berichtsart` (Gegner-Analyse vs. eigenes Team) sind Pflichtfelder. In Listen- und Detailansichten wird das immer als deutlich sichtbares Badge angezeigt (z. B. "⚽ Spiel: FC A vs. FC B, 12.03.2026" oder "🏋️ Training – freie Beobachtung", bzw. "🎯 Gegner-Analyse" vs. "🏠 Eigenes Team"), damit auf einen Blick klar ist, worauf sich ein Bericht bezieht.
- **media** – id, report_typ (player_report/team_report), report_id, typ (foto/video/video_link), url oder lokale_blob_ref, sync_status
- **attribute_definition** – id, gilt_für (player/team), name, typ (skala/text/auswahl…), skala_min, skala_max, ist_custom
- **scout** (User) – id, name, email, auth_provider

Die Felder `sync_status` + `client_uuid` + `updated_at` sind zentral für den Offline-Sync (s. u.).

## 4. Offline & Synchronisation – Konzept

1. **Jede Aktion schreibt zuerst lokal** in IndexedDB (Dexie) – die UI reagiert sofort, unabhängig vom Netzstatus.
2. Jeder Datensatz bekommt eine **clientseitig generierte UUID** (verhindert ID-Kollisionen zwischen Geräten) und einen Status: `pending`, `synced`, `error`.
3. Ein **Sync-Manager** lauscht auf das Browser-`online`-Event und prüft zusätzlich periodisch die Verbindung. Sobald online:
   - Ausstehende (`pending`) Datensätze werden zur Supabase-API hochgeladen.
   - Serverseitige Änderungen (z. B. von anderen Geräten desselben Scouts) werden heruntergeladen.
4. **Konfliktauflösung:** Last-Write-Wins auf Basis von `updated_at` – ausreichend, da Berichte i. d. R. genau einem Scout gehören und selten parallel bearbeitet werden.
5. **Medien (Fotos):** werden zunächst als lokale Blobs in IndexedDB/Cache Storage gehalten und erst beim Sync zu Supabase Storage hochgeladen.
6. **Upgrade-Pfad:** Falls die Sync-Anforderungen später wachsen (z. B. echte Mehrbenutzer-Konflikte, Realtime-Kollaboration), kann man auf robustere Lösungen wie **RxDB Replication** (Apache-2.0, kostenlos) oder **PowerSync** (Free Tier: 2 GB Sync/Monat) migrieren, ohne das Datenmodell grundlegend zu ändern.

## 5. Feature-Liste (gruppiert)

### Auth & Nutzerverwaltung
- Login via Google OAuth + E-Mail Magic Link
- (Später) Rollen: Scout / Trainer-Ansicht / Admin

### Stammdaten
- Manuelle Anlage von Vereinen, Spielern, Spielen (immer möglich, unabhängig vom Import)
- Import von Basisdaten für deutsche Amateur- und Jugendligen über fussball.de-Daten (s. Abschnitt 2a) via Import-Adapter-Architektur
- Deduplizierung von Spielern/Vereinen beim Import (Abgleich über externe IDs + Namens-/Geburtsdatum-Fuzzy-Match)
- Architektur offen für weitere Adapter (z. B. ausländische Ligen), ohne Kernlogik anzufassen

### Spieler-Scouting
- Erfassungsformular mit Basis-Set an Feldern (siehe Datenmodell) + frei erweiterbaren Custom-Feldern
- **Bezugstyp pro Bericht:** Spiel (verknüpft mit `match`) oder Training/sonstige freie Beobachtung (ohne Spielbezug) – beides muss möglich und in der UI klar erkennbar/unterscheidbar sein (Badges, Filter)
- Foto-Aufnahme direkt aus der App (Kamera-Zugriff)
- Verlaufsansicht: mehrere Berichte pro Spieler über Zeit
- Spieler-Vergleich (Side-by-Side, mehrere Spieler)
- **Bewertungsraster MVP** (Startpunkt, erweiterbar über `attribute_definitions`, s. u.):
  - **Technik** (1–10): Ballannahme/-kontrolle, Passspiel, Torabschluss, Dribbling
  - **Taktik** (1–10): Spielübersicht, Stellungsspiel, Zweikampfverhalten
  - **Athletik** (1–10): Schnelligkeit, Sprungkraft/Explosivität, Ausdauer, Körperlichkeit/Zweikampfstärke
  - **Mentalität** (1–10): Einstellung/Einsatz, Führungsqualität, Verhalten in Drucksituationen
  - **Gesamtbewertung** (1–10, manuell vom Scout vergeben – nicht automatisch aus den Einzelwerten berechnet, da der Scout einen Gesamteindruck oft anders gewichten möchte)
  - Freitextfeld für Stärken, Schwächen und allgemeine Notizen
  - Empfehlung (z. B. "unbedingt beobachten", "im Blick behalten", "kein Potenzial")

### Team-/Gegner-Scouting
- Erfassungsformular für Formation, Spielstil, Standardsituationen, Stärken/Schwächen
- Verknüpfung mit Spielen/Vereinen (oder Training/freie Beobachtung – analog zum Spieler-Bericht)
- **Klare Trennung per `berichtsart`:** Gegner-Analyse vs. Analyse des eigenen/beobachteten Teams – beides ist möglich, wird aber in Formular, Liste und Export immer deutlich als solches gekennzeichnet

### Offline & Sync
- Vollständige Nutzung ohne Internetverbindung (Formulare, Fotos, Ansicht bereits erfasster Daten)
- Automatischer Hintergrund-Sync bei Wiederverbindung + manueller "Jetzt synchronisieren"-Button
- Sync-Status-Anzeige pro Bericht (offline erfasst / wird synchronisiert / synchronisiert)

### Dashboards & Auswertung
- Spieler-Dashboard: Filter nach Position, Alter, Liga, Bewertung
- Team-Dashboard: Übersicht analysierter Gegner/Teams
- Entwicklungsverlauf einzelner Spieler über mehrere Berichte

### Export
- PDF-Export einzelner Berichte (client-seitig, offline-fähig)
- JSON-Export (einzelner Bericht + Sammel-Export mehrerer Berichte)

### Erweiterbarkeit
- UI zum Anlegen neuer Bewertungs-Kategorien/Felder (`attribute_definitions`) ohne Code-Änderung
- Dynamische Anwendung dieser Felder in Formularen, Dashboards und Exporten

## 6. MVP & Meilensteine

**M0 – Fundament (MVP)**
- Projekt-Setup: Astro + Tailwind + React-Islands, Vercel-Deployment, Supabase-Projekt
- Login (Google + Magic Link)
- Grunddatenmodell: Vereine, Spieler, Spiele (manuelle Anlage)
- Spieler-Scouting-Formular mit MVP-Bewertungsraster (Technik/Taktik/Athletik/Mentalität + Gesamtbewertung + Freitext) + Kamera-Foto
- **Bezugstyp** (Spiel vs. Training/freie Beobachtung) als Pflichtfeld inkl. klar erkennbarer Kennzeichnung in Liste/Detail
- Lokale Speicherung (Dexie/IndexedDB) + PWA-Grundgerüst (offline installierbar, App-Shell cachebar)
- Einfacher, manuell ausgelöster Sync ("Jetzt synchronisieren")
- Liste & Detailansicht eigener Berichte

**M1 – Team-/Gegner-Scouting**
- Team-Analyse-Formular (Formation, Spielstil, Stärken/Schwächen)
- **Berichtsart** (Gegner-Analyse vs. eigenes/beobachtetes Team) + Bezugstyp (Spiel vs. Training/frei) als Pflichtfelder, klar sichtbar gekennzeichnet
- Verknüpfung mit Spielen/Vereinen

**M2 – Datenimport (deutsche Amateur-/Jugendligen) & Dedup**
- Import-Adapter-Architektur (`ImportProvider`-Interface, s. Abschnitt 2a)
- Erster Adapter: **fussball.de-Daten** (via api-fussball.de oder eigenem Scraper) für Vereine, Mannschaften/Ligen (Kreisliga bis Landes-/Verbandsliga), Spielpläne, Logos – inkl. Jugendmannschaften (A- bis F-Junioren/-innen)
- Dedup-Logik beim Import (Abgleich gegen bestehende Datensätze über externe ID + Namens-/Ort-Fuzzy-Match)
- Bewusst **kein** Adapter für ausländische Ligen in M2 (Backlog, s. u.) – Architektur lässt das aber zu

**M3 – Robuster Offline-Sync**
- Automatischer Hintergrund-Sync bei Wiederverbindung (statt nur manuell)
- Sync-Status-Anzeige, Fehlerbehandlung/Retry

**M4 – Dashboards**
- Spieler-Dashboard mit Filtern & Vergleich
- Team-Dashboard
- Verlaufsansicht pro Spieler

**M5 – Export**
- PDF-Export (jsPDF)
- JSON-Export (Einzel + Sammel)

**M6 – Erweiterbarkeit**
- UI für benutzerdefinierte Attribute/Bewertungs-Kategorien
- Integration dieser dynamischen Felder in Formulare, Dashboards, Exporte

**Später (Backlog, nicht Teil der ersten Iterationen)**
- Weitere Rollen (Trainer-Ansicht, Admin)
- **Ausländische Ligen als weiterer Import-Adapter** (z. B. football-data.org oder API-Football), sobald benötigt – rein additiv dank Adapter-Architektur aus M2
- Video-Handling (Kompression/externe Hosting-Strategie)
- Ggf. Wechsel zu RxDB/PowerSync, falls Sync-Anforderungen wachsen
- Apple Sign-In (sobald Budget vorhanden)

## 7. Entscheidungen aus Abstimmungsrunde 2

- ✅ Reihenfolge der Meilensteine bestätigt.
- ✅ MVP-Bewertungskategorien: Technik, Taktik, Athletik, Mentalität (je 1–10) + manuelle Gesamtbewertung + Freitext (s. Abschnitt 5) – erweiterbar über `attribute_definitions` (M6).
- ✅ Sowohl spielgebundene als auch freie Beobachtungen (Training/sonstige) müssen möglich sein – als `bezugstyp`-Pflichtfeld modelliert, immer klar sichtbar gekennzeichnet.
- ✅ Sowohl Gegner-Analyse als auch Analyse des eigenen/beobachteten Teams müssen möglich sein – als `berichtsart`-Pflichtfeld modelliert, immer klar sichtbar gekennzeichnet.
- ✅ Datenimport-Quelle für M2: **fussball.de-Daten** (deutsche Amateur- & Jugendligen) statt football-data.org/TheSportsDB, da diese ausschließlich internationale Top-Ligen abdecken. Kein offizielles API vorhanden → Nutzung eines inoffiziellen Community-Crawlers (z. B. api-fussball.de) mit entsprechendem Vorbehalt (s. Abschnitt 2a). Ausländische Ligen bleiben vorerst out of scope, werden aber über die Adapter-Architektur später ergänzbar sein.

## 8. Offene Punkte zur weiteren Abstimmung

- Sollen wir den Import direkt auf ganz Deutschland auslegen, oder zunächst auf bestimmte Landes-/Bezirksverbände (z. B. die Region, in der eure Scouts aktiv sind) eingrenzen, um Aufwand/Datenmenge zu reduzieren?
- Soll die Gesamtbewertung eine reine Zahl sein, oder zusätzlich mit einer kurzen Kategorisierung versehen werden (z. B. Ampel-System "sofort handeln / beobachten / kein Bedarf")?
- Gibt es bereits einen bevorzugten Namen/Domain für die App (relevant für Vercel-Projektnamen, Supabase-Projekt, ggf. PWA-App-Namen/Icon)?
