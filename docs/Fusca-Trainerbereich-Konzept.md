# Fusca – Konzept: Erweiterung um Trainerbereich

**Stand:** 07.08.2026
**Status:** Konzeptphase, vor Implementierung

---

## 1. Ausgangslage

Fusca ist aktuell eine Scouting-App für Einzelpersonen ("nur deine Daten"): mobile Erfassung am Spielfeldrand, Desktop-Auswertung danach. Anfrage: Anpassung für Trainer von Jugendmannschaften, mit der Möglichkeit, dass Trainer und Scouts zusammenarbeiten und Profile austauschen können.

**Kernunterschied der beiden Nutzergruppen:**

| | Scout | Trainer |
|---|---|---|
| Fokus | Fremde Spieler, episodisch | Eigener Kader, fortlaufend über Saison |
| Zeitbezug | Einzelbericht / Snapshot | Entwicklungsverlauf über Zeit |
| Ziel | Vergleich vieler Spieler | Entwicklung einzelner Spieler, Kadermanagement |

---

## 2. Datenmodell-Prinzip: Ein Kern, zwei Nutzungsarten

Kein getrenntes Datenmodell für Scout/Trainer. Stattdessen ein gemeinsamer Kern:

- Jedes Spielerprofil hat einen **Owner** (wer den Spieler ursprünglich angelegt hat)
- Jede Bewertung ist ein chronologischer **Eintrag** (Attribut-Werte + Datum + Kontext)
- Scout-Bericht (Snapshot) und Trainer-Beobachtung (fortlaufend) sind strukturell dasselbe Objekt – nur Frequenz und Zweck unterscheiden sich
- Die Entwicklungskurve für Trainer ergibt sich automatisch aus der Chronologie der Einträge, ohne zusätzliche Datenhaltung

---

## 3. Freigabe-Modell (Scout ↔ Trainer Austausch)

**Kein offener Marktplatz / keine Suche** – gezielte Freigabe per Einladung, aus Datenschutzgründen insbesondere bei Minderjährigen zwingend.

**Rollen pro freigegebenem Profil:**

- **Owner** – volle Rechte (i. d. R. der Trainer, der den Spieler angelegt hat)
- **Contributor** – darf Bewertungen ergänzen, keine Stammdaten ändern (z. B. eingeladener Scout, der ein Talent beobachtet)
- **Viewer** – nur lesend, meist auf aggregierte Bewertungen beschränkt

**Ablauf:** Einladung per zeitlich befristetem Link/Code → Annahme → Zugriff aktiv → jederzeit widerrufbar durch Owner. Kein Auffinden fremder Profile über Suche.

**Neuer Navigationspunkt "Freigaben":** pro Spieler Übersicht, wer Zugriff hat; eingehende Freigaben von anderen gespiegelt im gleichen Bereich.

---

## 3.1 Doppelte Profile: Verknüpfung statt Merge

Fall: Scout und Trainer legen unabhängig voneinander denselben Spieler an. Da bewusst kein Geburtsdatum erfasst wird (siehe Abschnitt 4), ist Matching unscharf – daher kein automatisches Zusammenführen, sondern ein bestätigungspflichtiger Vorschlag.

**Matching-Signale (kombiniert, kein harter Schlüssel):**
- Name (fuzzy, tippfehlertolerant)
- Jahrgang (exakt oder ±1 wegen möglicher Uneindeutigkeit bei Saisonwechsel)
- Verein/Team, falls erfasst
- Position (unterstützend)

Ab einem Schwellenwert: Hinweis "Möglicher Doppelgänger gefunden" beim Anlegen/Bearbeiten eines Spielerprofils.

**Blind-Match zur Wahrung der Privatsphäre:** Vor Bestätigung sehen beide Seiten nur eine reduzierte Voransicht (z. B. Jahrgang, Verein), nicht das volle fremde Profil – sonst würde das eigentliche Freigabe-Prinzip unterlaufen. Verknüpfung erst nach aktiver Zustimmung **beider** Owner.

**Verknüpfung statt Datenbank-Merge:** Beide Owner behalten ihre eigene Berichtshistorie. Eine bestätigte Verknüpfung aktiviert automatisch das bestehende Freigabe-Modell (Contributor/Viewer, siehe Abschnitt 3) zwischen beiden Parteien – keine dritte Datenstruktur nötig.

```
Player_Link: id, player_id_a, owner_a, player_id_b, owner_b,
             match_score, status (vorgeschlagen/bestätigt/abgelehnt), confirmed_at
```

---

## 4. Jugendschutz & Datensparsamkeit

Eingebaut ins Datenmodell, nicht nachträglich aufgesetzt:

- **Zwei Datenebenen pro Profil:**
  - *Sensible Stammdaten* (Name, Geburtsdatum, Kontakt, Foto) – bleiben beim Owner, werden bei Freigabe standardmäßig **nicht** mitgegeben
  - *Bewertungsdaten* (Attribute, Notizen) – das ist der eigentlich geteilte Teil
- **Jahrgang statt volles Geburtsdatum** bei Jugendspielern (im Jugendfußball ohnehin gängige Einheit, reduziert sensible Daten)
- **Einwilligungs-Feld pro Kadereintrag**, dreistufig: *ausstehend / erteilt / verweigert* – steuert, ob eine externe Freigabe an Scouts überhaupt möglich ist
- Bewertungssprache im Jugendbereich eher entwicklungs- als "transfermarkt"-orientiert (ggf. eigene Presets bei Bewertungsfeldern)

---

## 5. Registrierung & Rollenmodell

- Rollen als **Mehrfachauswahl**, nicht als Entweder-Oder (Scout / Trainer / beides) – viele Nutzer sind beides
- Bei Auswahl "Trainer": zusätzliche Pflichtfelder – Verein/Team, betreute Altersklasse(n) (z. B. U12, U15)
- Keine Verifizierung im MVP (Selbstauskunft), Vereins-Bestätigung als mögliche spätere Ausbaustufe
- Rollen nachträglich erweiterbar (Einstellungen → "Ich bin jetzt auch Trainer"), mit definierbarer primärer Standardansicht
- Bei Doppelrolle: Umschalter im UI, analog zum bestehenden "Desktop-Arbeitsplatz"-Kontextlabel

---

## 6. Trainer-Navigation (Vorschlag)

| Scout-Nav (aktuell) | Trainer-Nav (neu) |
|---|---|
| Spieler | **Kader** – eigene Mannschaft, nach Jahrgang gruppiert |
| Dashboard | **Entwicklung** – Verlauf pro Spieler über die Saison |
| Berichte | **Beobachtungen** – fortlaufende Einträge statt Einzelreport |
| – | **Freigaben** – Zugriffsverwaltung pro Spieler (neu) |
| – | **Aufstellung** – Taktiktafel (neu, siehe Abschnitt 7) |
| Bewertungsfelder | Bewertungsfelder (Jugend-Presets möglich) |

---

## 7. Feature: Aufstellung & Taktiktafel

### 7.1 Grundfunktion
- Spielfeld-Editor (Tablet/Desktop-first): Spieler als Tokens per Drag & Drop positionierbar
- Formationsvorlagen (4-4-2, 4-3-3, …) als Startpunkt, frei anpassbar
- Umschalter offensive/defensive Formation: zwei gespeicherte Positions-Sets, animierter Übergang zeigt Verschiebung bei Ballbesitzwechsel

### 7.2 Bewegungsmuster (taktisches Zeichenwerkzeug)
- Zeichenebene über dem Spielfeld: Pfad von Start- zu Zielposition pro Spieler
- Unterscheidung **Lauf ohne Ball** (gestrichelt) vs. **Passweg** (durchgezogen, mit Pfeilspitze) – gängige Trainer-Konvention
- **Sequenzen statt Einzelbild:** Spielzug als Schrittfolge (Schritt 1 → 2 → 3), navigierbar wie Folien; echte Abspiel-Animation als spätere Ausbaustufe, nicht MVP
- Technisch: SVG-Pfade über Pointer-Events gezeichnet, Speicherung als Punkte-Array (JSON) statt Bild – bleibt editierbar

### 7.3 Mobile Ansicht
- Grundsätzlich eigene, für Touch optimierte Ansicht (kein reiner Desktop-Klon)
- Positionierung: Tap-to-place (Spieler antippen → Zielposition antippen) statt Drag & Drop, da auf kleinem Screen präziser
- Freihand-Zeichnen der Bewegungsmuster auf Mobile eher zum **Betrachten** vorgesehen, Erstellen bleibt Desktop/Tablet-first – konsistent mit bestehender App-Philosophie ("am Platz erfassen, am Desktop nachbereiten")

### 7.4 Kopplung an Spiele (lose, nicht abhängig)
- Taktik/Aufstellung existiert unabhängig von einem Spiel (freie Vorlagenbibliothek), kann aber optional einem Spiel zugeordnet werden
- Bei Spielzuordnung wird zusätzlich pro Spieler festgehalten: tatsächliche Position, gespielte Minuten, Start-XI/Bank/Einwechslung
- Diese Ist-Daten sind bewusst getrennt von der geplanten Aufstellung (Soll), da sich der Spielverlauf ändert (Wechsel, Halbzeit-Anpassungen)
- Nutzen: speist automatisch die Entwicklungsansicht des Trainers (z. B. "Spieler X: 8x Linksverteidiger, 3x Sechser diese Saison")

### 7.5 Vereinfachtes Datenmodell

```
Spiel (game): id, datum, gegner, team_id
Aufstellung (formation): id, name, game_id (nullable), created_at
Formation_Spieler (formation_player): formation_id, player_id, position, x, y
Bewegung (movement): id, formation_id, player_id, pfad (JSON), typ (Lauf/Pass), reihenfolge
Spiel_Teilnahme (game_participation): game_id, player_id, position, minuten_von, minuten_bis, rolle
```

---

## 8. Vor der Implementierungsplanung zu klären

### 8.1 Widerruf der Einwilligung nach bereits erfolgter Freigabe
Das Einwilligungs-Feld (Abschnitt 4) deckt bisher nur den Zustand *vor* einer Freigabe ab. Offene Frage: Wird bei nachträglichem Widerruf durch die Eltern die aktive Freigabe automatisch entzogen? Bleiben bereits vom Contributor erstellte Bewertungen bestehen (ggf. anonymisiert) oder werden sie gelöscht? Braucht eine klare Regel, nicht nur ein Datenfeld.

### 8.2 Offline-Fähigkeit der neuen Bereiche
Die App unterstützt Offline-Erfassung mit Sync-Indikator. Kader-Pflege und v. a. die Taktiktafel (Freihand-Zeichnen) werden vermutlich ebenfalls am Spielfeldrand ohne verlässliches Netz genutzt. Sync-Konflikte bei gleichzeitiger Bearbeitung (z. B. zwei Trainer/Co-Trainer gleichzeitig an derselben Aufstellung) sollten früh geklärt werden.

### 8.3 Nachvollziehbarkeit bei Mehrfachzugriff
Sobald mehrere Personen (Owner + Contributor) an einem Profil arbeiten, ist ein einfaches Änderungsprotokoll ("wer hat wann was eingetragen") sinnvoll – aus Verantwortungsgründen bei Jugenddaten und zur Konfliktvermeidung bei gleichzeitiger Bearbeitung.

### 8.4 Mehrere Teams pro Trainer
Viele Jugendtrainer betreuen mehrere Mannschaften parallel (z. B. U12 und U14). Der Kader-Screen sollte Team-Auswahl/-Wechsel von Anfang an als Struktur mitdenken, um einen späteren Umbau zu vermeiden.

### 8.5 Priorisierung / Phasenplan
Vorschlag für einen MVP-Schnitt, statt alles auf einmal zu bauen:
- **V1:** Rollenmodell, Kader, Entwicklungsansicht, einfache Freigabe (ohne Doppelgänger-Matching), Aufstellung nur als Positions-Board (ohne Zeichenwerkzeug)
- **V2:** Doppelgänger-Matching (Abschnitt 3.1), Bewegungsmuster/Taktik-Sequenzen (Abschnitt 7.2), Spielzuordnung (Abschnitt 7.4)

---

## 9. Weitere Optimierungsideen (Editor-Experience & Nutzbarkeit)

**Editor-Experience (Taktiktafel)**
- Undo/Redo bei einem Zeichenwerkzeug praktisch Pflicht
- Vorherige Aufstellung als Startpunkt duplizieren statt Neuaufbau
- Sichtbarer Speicherstatus analog zum bestehenden Sync-Indikator, gerade bei Offline-Nutzung relevant

**Datennutzbarkeit (Kader & Entwicklung)**
- Trend-Sparkline direkt in der Kader-Liste pro Spieler, um Entwicklung auf einen Blick zu sehen, ohne jedes Profil zu öffnen
- Filter/Sortierung im Kader nach Position, Jahrgang, Einwilligungsstatus (wichtig sobald mehrere Teams, siehe 8.4)
- Export der Aufstellung als PDF/Bild zum Ausdrucken oder Teilen mit Eltern/Team

**Konsistenz**
- Farbcodierung offensiv/defensiv nicht als einzige Unterscheidung (Farbfehlsichtigkeit) – zusätzliches Label/Icon, analog zur bereits gelösten gestrichelt/durchgezogen-Unterscheidung bei Bewegungspfaden
- Eigener kurzer Onboarding-Schritt für die Trainer-Rolle, da die bestehende Hilfe-Seite aktuell auf Scout-Workflows ausgelegt ist

---

## 10. Offene Punkte für die nächste Runde

- Wireframes/Figma-Struktur für Registrierung, Kader-Screen, Freigaben-Bereich
- Detaillierter Freigabe-Flow als Schritt-für-Schritt-Journey (Einladung → Annahme → Widerruf)
- Technische Prüfung: Pointer-Events/SVG-Zeichnen auf verschiedenen Tablet-Größen
- Rechtliche Prüfung Einwilligungstext für Eltern (Formulierung, nicht nur Datenmodell)
- Feintuning der Matching-Schwellenwerte für Doppelgänger-Erkennung (Abschnitt 3.1), ggf. mit Testdaten
