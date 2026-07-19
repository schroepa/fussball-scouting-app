import type { AttributeDefinition } from "./types";

/**
 * MVP-Bewertungsraster für Spieler (siehe docs/PLANNING.md, Abschnitt 5).
 * Diese Liste ist nur der Startpunkt ("ist_custom: false") – Scouts können
 * über die Erweiterbarkeits-Funktion (M6) eigene Kategorien ergänzen, die
 * dann als zusätzliche Einträge mit `istCustom: true` in dieselbe Tabelle
 * (lokal: Dexie-Tabelle `attributeDefinitions`, zentral: Supabase-Tabelle
 * `attribute_definitions`) geschrieben werden.
 */
export const DEFAULT_PLAYER_ATTRIBUTES: AttributeDefinition[] = [
  {
    id: "default-technik",
    giltFuer: "player",
    key: "technik",
    name: "Technik",
    typ: "skala",
    skalaMin: 1,
    skalaMax: 10,
    gruppe: "Technik (Ballannahme, Passspiel, Torabschluss, Dribbling)",
    istCustom: false,
    reihenfolge: 1,
  },
  {
    id: "default-taktik",
    giltFuer: "player",
    key: "taktik",
    name: "Taktik",
    typ: "skala",
    skalaMin: 1,
    skalaMax: 10,
    gruppe: "Taktik (Spielübersicht, Stellungsspiel, Zweikampfverhalten)",
    istCustom: false,
    reihenfolge: 2,
  },
  {
    id: "default-athletik",
    giltFuer: "player",
    key: "athletik",
    name: "Athletik",
    typ: "skala",
    skalaMin: 1,
    skalaMax: 10,
    gruppe: "Athletik (Schnelligkeit, Sprungkraft, Ausdauer, Körperlichkeit)",
    istCustom: false,
    reihenfolge: 3,
  },
  {
    id: "default-mentalitaet",
    giltFuer: "player",
    key: "mentalitaet",
    name: "Mentalität",
    typ: "skala",
    skalaMin: 1,
    skalaMax: 10,
    gruppe: "Mentalität (Einstellung, Führungsqualität, Drucksituationen)",
    istCustom: false,
    reihenfolge: 4,
  },
];

export const DEFAULT_TEAM_ATTRIBUTES: AttributeDefinition[] = [];

export const DEFAULT_ATTRIBUTES: AttributeDefinition[] = [
  ...DEFAULT_PLAYER_ATTRIBUTES,
  ...DEFAULT_TEAM_ATTRIBUTES,
];
