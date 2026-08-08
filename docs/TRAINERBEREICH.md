# Fusca – Trainerbereich (Konzept + V1-Entscheidungen)

**Stand:** 08.08.2026  
**Status:** V1 erledigt · V2 in Umsetzung  
**Quelle:** Konzept „Erweiterung um Trainerbereich“ (07.08.2026)

---

## Ziel

Gemeinsamer Kern für Scout und Trainer: Owner-scoped Spielerprofile, chronologische Bewertungseinträge, gezielte Freigabe (kein Marktplatz). Trainer-Navigation: Kader, Entwicklung, Beobachtungen, Freigaben, Aufstellung.

## Phasen

| Phase | Umfang |
|---|---|
| **V1** | Rollenmodell, Teams/Kader, Entwicklung, Freigaben, Positions-Board – **erledigt** |
| **V2 (jetzt)** | Doppelgänger-Matching (Blind-Match), Bewegungsmuster/Taktik-Sequenzen, Spielzuordnung inkl. Teilnahme-Ist-Daten – siehe `docs/TRAINERBEREICH_V2.md` |

## Entscheidungen zu offenen Punkten (Abschnitt 8)

### 8.1 Widerruf der Einwilligung

- Status `verweigert` **widerruft automatisch** alle aktiven Freigaben dieses Spielers.
- Bereits erstellte Contributor-Bewertungen **bleiben** (mit `scoutId` für Nachvollziehbarkeit).
- Neue externe Freigaben sind bei `ausstehend`/`verweigert` gesperrt; nur `erteilt` erlaubt Freigabe.

### 8.2 Offline

- Kader, Freigaben-Annahme und Aufstellung nutzen dasselbe Outbox-Modell (`pending` → Sync).
- Konflikte: **Last-Write-Wins** wie bestehend. Gleichzeitiges Co-Trainer-Editing an derselben Aufstellung ist V1-akzeptiert (kein OT/CRDT).

### 8.3 Nachvollziehbarkeit

- Bewertungen tragen weiter `scoutId` + Zeitstempel.
- Freigaben speichern Owner, Rolle, Annahme, Widerruf-Zeitpunkt.
- Kein separates Audit-Log in V1.

### 8.4 Mehrere Teams

- Entity `teams` von Anfang an; aktiver Team-Kontext in `localStorage` (`fusca_active_team_id`).
- Kader- und Aufstellungs-Screens filtern nach aktivem Team.

### 8.5 Priorisierung

- V1 wie oben; V2 bewusst zurückgestellt (Matching, SVG-Zeichnen, Game-Participation).

## Jugendschutz (V1)

- `jahrgang` am Spieler (Zahl, z. B. 2014); volles Geburtsdatum bleibt optional (Scout-Kompatibilität).
- Einwilligung pro Kadereintrag: `ausstehend` | `erteilt` | `verweigert`.
- Freigabe teilt standardmäßig **keine** sensiblen Stammdaten (`sharePii: false`); nur Bewertungsdaten für Contributor/Viewer nach Annahme.

## Rollen & Modus

- `roles: ("scout" | "trainer")[]` – Mehrfachauswahl.
- `primaryMode` + UI-Umschalter `fusca_app_mode` (scout | trainer).
- Trainer-Pflichtfelder beim Aktivieren: Verein/Team-Name, Altersklasse(n).

## SQL

Ops: `supabase/trainer_v1.sql` in Supabase ausführen (Tabellen + Scout-Felder + RLS).
