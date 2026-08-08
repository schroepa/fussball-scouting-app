# Fusca – Trainerbereich V2

**Stand:** 08.08.2026  
**Status:** in Umsetzung  
**Voraussetzung:** V1 (`docs/TRAINERBEREICH.md`, `supabase/trainer_v1.sql`)

## Umfang

| Thema | Inhalt |
|---|---|
| **Doppelgänger** | Fuzzy-Matching (Name, Jahrgang ±1, Verein, Position); Blind-Preview; `player_links` mit Status vorgeschlagen/bestätigt/abgelehnt; Verknüpfung statt Merge; bei Bestätigung beider Seiten Freigabe (Contributor) |
| **Bewegungsmuster** | SVG-Zeichenebene: Lauf (gestrichelt) vs. Pass (durchgezogen + Pfeil); Speicherung als Punkte-JSON |
| **Sequenzen** | Spielzug als Schritte (Folien), navigierbar; keine Abspiel-Animation |
| **Spielzuordnung** | Formation optional an Match; `game_participations` (Soll ≠ Ist): Position, Minuten, Rolle Start-XI/Bank/Wechsel |

## Matching-Schwellen

- Score 0–100 aus gewichteten Signalen
- Ab **55**: Hinweis „Möglicher Doppelgänger“
- Blind-Preview: Jahrgang, Verein, Positionen, Score – **kein** Name/Foto vor Bestätigung

## SQL

Ops: `supabase/trainer_v2.sql` nach `trainer_v1.sql` ausführen.
