# Plan: Riester-Optionen + Oberflächen-Optimierung

> Stand: Juli 2026 · Abstimmungsdokument (noch keine Umsetzung)  
> Agent-Run: [Riester optionen und oberfläche](https://cursor.com/agents/bc-1ba13133-f600-49aa-889f-b86293c49c8c)

---

## 0. Wichtiger Befund: Repo-Mismatch

Dieses Repository ist die **Fussball Scouting App (Fusca)**  
(`github.com/schroepa/fussball-scouting-app`).

| Erwartung (Auftrag) | Ist-Zustand (dieses Repo) |
|---|---|
| Riester-Rente „reicht?“ | **nicht vorhanden** |
| Optionen: umwandeln / stilllegen / löschen | **nicht vorhanden** |
| Altersvorsorge-Domain | Fußball-Scouting (Berichte, Dashboard, Sync) |

Es gibt **keine** Treffer zu Riester, Rente, Zulage, Umwandeln oder Stilllegen.

**Entscheidung nötig (bitte bestätigen):**

| Option | Bedeutung |
|---|---|
| **A** | Falsches Repo → Plan unten als Vorlage; Umsetzung im richtigen Riester-Repo neu starten |
| **B** | Auftrag war metaphorisch / falsch formuliert → Plan Abschnitt 4 (UI/shadcn in Fusca) umsetzen |
| **C** | Neues Produkt „Riester-Beratung“ in diesem Monorepo starten (großer Scope-Wechsel) |

Ohne A/B/C keine Feature-Implementierung.

---

## 1. Produktvision (Zielbild Riester)

### Heute (laut Auftrag)
Nutzer sieht, ob die Riester-Rente „reicht“ (Versorgungsgrad / Lücke).

### Neu
Zusätzlich klare **Handlungsoptionen**, wie mit dem bestehenden Vertrag umgegangen werden soll:

1. **Weiterführen** – Beiträge / Zulagen weiter nutzen  
2. **Umwandeln** – z. B. in andere Vorsorgeform / Vertragswechsel (rechtliche Grenzen beachten)  
3. **Stilllegen** – beitragsfrei stellen, Guthaben stehen lassen  
4. **Kündigen / auflösen** („löschen“) – Rückkauf / Auflösung inkl. Förder-Rückzahlung-Risiken

Jeder Optionspfad soll **verständlich, vergleichbar und responsiv** erklärt werden – keine reine Textausgabe.

### Leitprinzipien
- **Entscheidungshilfe, keine Anlageberatung:** klare Disclaimer, Quellen, Annahmen
- **Transparenz:** Kosten, Förderverlust, Steuern, Timing als sichtbare Kriterien
- **Vergleichbarkeit:** gleiche Dimensionen für alle Optionen (Nettoeffekt, Flexibilität, Risiko, Aufwand)
- **Progressive Disclosure:** erst Empfehlungsrichtung, dann Details, dann „nächste Schritte“
- **Mobile-first Beratung:** am Handy lesbar entscheiden, am Desktop vergleichen

---

## 2. Use-Case: „Was soll ich mit meiner Riester machen?“

### 2.1 Primärer Flow

```
Eingabe Vertrag + Situation
        ↓
„Reicht?“ (Ist-Analyse / Versorgungsgrad)
        ↓
Optionen-Board (Weiterführen | Umwandeln | Stilllegen | Auflösen)
        ↓
Detail einer Option (Vor-/Nachteile, Zahlen, Risiken)
        ↓
Vergleich 2–3 Optionen
        ↓
Persönliche Checkliste / nächste Schritte
```

### 2.2 Nutzerfragen, die beantwortet werden müssen

| Frage | Optionen-Bezug |
|---|---|
| Lohnt sich Weiterzahlen noch? | Weiterführen |
| Kann ich in etwas Besseres wechseln? | Umwandeln |
| Was passiert, wenn ich beitragsfrei stelle? | Stilllegen |
| Was kostet mich die Auflösung wirklich? | Auflösen |
| Welche Förder-/Steuerfallen gibt es? | alle |

### 2.3 Entscheidungsfaktoren (gemeinsames Scoring-Modell)

Vorschlag für ein **transparentes Punkte-/Ampel-Modell** (nicht Blackbox):

| Dimension | Beschreibung | Gewicht (Draft) |
|---|---|---|
| **Förder-Netto** | Zulagen + Steuervorteil vs. Kosten | hoch |
| **Renditeerwartung / Kosten** | effektive Kostenquote, Chance auf Lücke | hoch |
| **Flexibilität** | Beitragsänderung, Pause, Auszahlung | mittel |
| **Steuer-/Rückzahlungsrisiko** | bei Kündigung / Zweckentfremdung | hoch |
| **Aufwand** | Formulare, Beratungspflicht, Wechselkosten | niedrig–mittel |
| **Passung zur Lebenssituation** | Alter, Kinder, Einkommen, Immobilienplan | kontextabhängig |

Ausgabe pro Option: **Ampel + Kurzbegründung + 3 Bullet-Risiken**.

### 2.4 Optionen-Steckbriefe (Inhaltspflicht)

#### Weiterführen
- Wann sinnvoll (z. B. volle Zulage erreichbar, niedrige Kosten, lange Restlaufzeit)
- Was der Nutzer prüfen muss (Anbieterkosten, Fondsauswahl, Zulagenantrag)
- CTA: „Beitrag optimieren“ / „Zulage prüfen“

#### Umwandeln
- Was „Umwandeln“ im Produkt bedeutet (klar definieren – rechtlich oft eingeschränkt)
- Alternativen: Anbieterwechsel intern, Beitragsreduktion, ergänzende Vorsorge *neben* Riester
- Warnung: nicht jede „Umwandlung“ ist rechtlich/vertraglich möglich
- CTA: „Wechseloptionen prüfen“

#### Stilllegen (beitragsfrei)
- Effekt auf Zulagen, Garantien, Kosten auf dem Bestand
- Wann sinnvoll (Liquiditätsengpass, schlechte Kosten/Nutzen-Lage)
- CTA: „Beitragsfrei stellen – Checkliste“

#### Auflösen / kündigen
- Rückkaufswert vs. eingezahlte Beiträge + Förder-Rückzahlung
- Steuerliche Folgen (stark vereinfacht, mit Disclaimer)
- Nur als bewusste Ultima Ratio darstellen
- CTA: „Auflösungs-Folgen berechnen“ (mit Bestätigungsschritt)

### 2.5 Ergebnis-UI (konzeptionell)

1. **Hero-Ergebnis „Reicht?“** – Versorgungsgrad / Lücke (bestehend)  
2. **Empfohlene Richtung** – 1 Primäremfehlung + 1 Alternative  
3. **Optionen-Grid** – 4 Karten mit Ampel + 1 Satz  
4. **Vergleichstabelle** – Dimensionen × Optionen  
5. **Detail-Drawer/Seite** – Annahmen, Rechnung, Quellen, Checkliste  

---

## 3. Offene Fachfragen (vor Implementierung klären)

1. Was genau ist der aktuelle „Reicht?“-Algorithmus (Inputs, Outputs, Annahmen)?  
2. Bedeutet „Umwandeln“ Anbieterwechsel, Fondsumschichtung, oder Ausstieg in andere Produktklasse?  
3. Soll das Tool eine **harte Empfehlung** geben oder nur **Szenarien vergleichen**?  
4. Welche Haftungs-/Disclaimer-Texte sind Pflicht (Finanztipp vs. Beraterprodukt)?  
5. Werden Nutzerdaten gespeichert (Account) oder nur session/local?  
6. Gibt es bestehende Content-/Rechtsquellen, die wir zitieren dürfen?

---

## 4. Oberflächen-Plan (Desktop / Tablet / Handy)

Gilt für ein Riester-Produkt **und** (teilweise) für Fusca, falls Option B.

### 4.1 Breakpoint-Strategie

| Gerät | Breakpoint | Layout-Idee Ergebnis & Optionen |
|---|---|---|
| **Handy** | `< 640px` (`sm`) | Einspaltig; Primäremfehlung oben; Optionen als vertikale Liste; Vergleich als horizontal scrollbare Dimensionen oder Accordion |
| **Tablet** | `640–1023px` | 2-Spalten-Optionen; Vergleich kompakt; Sticky „Annahmen“ |
| **Desktop** | `≥ 1024px` (`lg`) | 12-Spalten-Grid: links Ergebnis+Empfehlung, rechts Vergleich; Detail in Side-Panel |

### 4.2 Informationsarchitektur pro Viewport

**Handy (Entscheidungspfad):**
- Weniger Zahlen gleichzeitig
- Eine klare Primärhandlung
- Details hinter Accordion / Sheet
- Keine dichten Tabellen als Default

**Tablet:**
- Optionen 2×2
- Vergleich sichtbar, aber gekürzt (3 Kern-Dimensionen)

**Desktop:**
- Volle Vergleichstabelle
- Side-by-side Detail zweier Optionen
- Annahmen-Panel dauerhaft sichtbar

### 4.3 Motion (sparsam)
- Ampel/Score einblenden
- Optionskarte expandiert sanft
- Sheet/Drawer für Details auf Mobile

### 4.4 Accessibility
- Kontrast Ampel nicht nur farbbasiert (Textlabel)
- Touch-Targets ≥ 44px
- Fokusreihenfolge: Ergebnis → Empfehlung → Optionen → Vergleich

---

## 5. Native → shadcn Migration

### 5.1 Ziel
Native HTML-Controls durch **shadcn/ui (Base UI)** ersetzen, wo sinnvoll – konsistente Optik, Keyboard, Theming.

### 5.2 Mapping (generisch)

| Native heute | shadcn-Ziel | Hinweis |
|---|---|---|
| `<select>` | `Select` / `SimpleSelect` | Pflicht |
| `<input type="checkbox">` | `Checkbox` | Pflicht |
| `<input type="radio">` | `RadioGroup` (ggf. nachinstallieren) | Optionenwahl |
| Bestätigungsdialoge (`confirm`) | `AlertDialog` | Auflösen = destruktiv |
| Tabs manuell | `Tabs` | Ergebnis / Annahmen / Quellen |
| Tabellen roh | `Table` | Optionsvergleich Desktop |
| Drawer mobil | `Sheet` | Optionsdetail |
| Tooltips „Was bedeutet…?“ | `Tooltip` / `Popover` | Glossar |
| Segmentierte Wahl | `ToggleGroup` (ggf.) | Weiterführen/… |

### 5.3 Bewusste Ausnahmen (bleiben native)
- `input[type="date"]` – OS-Picker
- `input[type="file"]` – Upload
- `input[type="range"]` – nur wenn kein gleichwertiges shadcn-Pattern genutzt wird

### 5.4 Fusca-Ist (dieses Repo) – falls Option B

**Bereits vorhanden:** `badge`, `button`, `card`, `checkbox`, `input`, `label`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `table`, `tabs`, `textarea`, `tooltip`

**Bekannte Reste / Lücken:**
- Custom Shell in `Layout.astro` (nicht `SidebarProvider`)
- `RatingSlider` nutzt natives `range` (dokumentierte Ausnahme)
- Date/File-Inputs bleiben native (`docs/RADIUS.md`)
- `window.confirm` in `AttributeManager` → Kandidat für `AlertDialog`

**Responsive Ist:** Mobile Bottom-Nav / Desktop Sidebar ab `md` (768px); Formulare `sm`/`lg`-Grids. Tablet oft „Desktop light“, nicht eigenständig designed.

---

## 6. Vorgeschlagene Meilensteine

### Track R – Riester-Produkt (nur mit Repo A oder C)

| ID | Inhalt | Abhängigkeit |
|---|---|---|
| **R0** | Fachmodell Optionen + Disclaimer + Glossar | Entscheidung A/C |
| **R1** | Datenmodell Inputs/Outputs für Optionen-Scoring | R0 |
| **R2** | Ergebnis-UI „Reicht?“ + Empfehlungsrichtung | R1 |
| **R3** | Optionen-Board + Detail + Vergleich | R2 |
| **R4** | Responsive Fine-Tuning Phone/Tablet/Desktop | R3 |
| **R5** | shadcn-Durchgang Forms/Dialoge/Sheets | parallel R2–R4 |
| **R6** | Tests (Scoring-Unit), Copy-Review, Legal-Check | R3 |

### Track U – UI in Fusca (Option B / parallel sinnvoll)

| ID | Inhalt |
|---|---|
| **U1** | Audit: alle nativen Controls listen (Select/Checkbox/Confirm/…) |
| **U2** | AlertDialog für destruktive Aktionen |
| **U3** | Tablet-Layout-Pass (768–1023): Listen, Formulare, Dashboard |
| **U4** | Shell-Feinschliff (optional Sidebar-Primitive) |
| **U5** | Visuelle Regression / Playwright-Smoke je Breakpoint |

---

## 7. Abstimmungsfragen an dich

Bitte kurz entscheiden / kommentieren:

1. **Repo:** A (anderes Riester-Repo), B (nur Fusca-UI), oder C (neues Riester hier)?  
2. **Empfehlungsstärke:** harte Primäremfehlung vs. nur Szenarienvergleich?  
3. **„Umwandeln“:** welche rechtliche/produktliche Definition?  
4. **„Löschen“:** Kündigung/Auflösung zeigen – ja/nein, mit welcher Warnstufe?  
5. **Persistency:** Account + Historie oder einmaliger Rechner?  
6. **UI-Priorität:** erst Logik Optionen, oder erst Responsive/shadcn auf bestehendem Flow?

---

## 8. Empfohlene nächste Schritte nach deinem Feedback

1. A/B/C festlegen  
2. Bei A: Agent im korrekten Repo mit diesem Plan als Startpunkt  
3. Bei B: Track U starten (Audit → AlertDialog → Tablet-Pass)  
4. Bei C: R0 Fachmodell + Disclaimer zuerst, erst dann UI  

---

## Anhang: Was dieses Repo heute leistet (Kontext)

- Scouting-PWA: Berichte, Dashboard, Import, Sync, Hilfe  
- Plan-Basis: `docs/PLANNING.md` v3 (Milestones M0–M11 weitgehend erledigt)  
- UI-Regeln: `docs/RADIUS.md`, `docs/CONVENTIONS.md`  
- Stack: Astro 7 + React Islands + Tailwind 4 + shadcn (Fusca)
