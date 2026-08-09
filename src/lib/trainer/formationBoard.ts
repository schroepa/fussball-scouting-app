import type { FormationPlayerPos } from "../types";
import { COMMON_FORMATIONS } from "../match/formations";

export { COMMON_FORMATIONS };

/** Relative Slot-Koordinaten (x/y 0-100) für Startaufstellungen. */
const LAYOUTS: Record<string, Omit<FormationPlayerPos, "playerId">[]> = {
  "4-4-2": [
    { positionLabel: "TW", x: 50, y: 8 },
    { positionLabel: "LV", x: 18, y: 28 },
    { positionLabel: "IV", x: 38, y: 26 },
    { positionLabel: "IV", x: 62, y: 26 },
    { positionLabel: "RV", x: 82, y: 28 },
    { positionLabel: "LM", x: 18, y: 52 },
    { positionLabel: "ZM", x: 38, y: 50 },
    { positionLabel: "ZM", x: 62, y: 50 },
    { positionLabel: "RM", x: 82, y: 52 },
    { positionLabel: "ST", x: 38, y: 78 },
    { positionLabel: "ST", x: 62, y: 78 },
  ],
  "4-3-3": [
    { positionLabel: "TW", x: 50, y: 8 },
    { positionLabel: "LV", x: 18, y: 28 },
    { positionLabel: "IV", x: 38, y: 26 },
    { positionLabel: "IV", x: 62, y: 26 },
    { positionLabel: "RV", x: 82, y: 28 },
    { positionLabel: "ZM", x: 50, y: 48 },
    { positionLabel: "ZM", x: 32, y: 55 },
    { positionLabel: "ZM", x: 68, y: 55 },
    { positionLabel: "LF", x: 20, y: 78 },
    { positionLabel: "ST", x: 50, y: 82 },
    { positionLabel: "RF", x: 80, y: 78 },
  ],
  "4-2-3-1": [
    { positionLabel: "TW", x: 50, y: 8 },
    { positionLabel: "LV", x: 18, y: 28 },
    { positionLabel: "IV", x: 38, y: 26 },
    { positionLabel: "IV", x: 62, y: 26 },
    { positionLabel: "RV", x: 82, y: 28 },
    { positionLabel: "DM", x: 38, y: 46 },
    { positionLabel: "DM", x: 62, y: 46 },
    { positionLabel: "LM", x: 20, y: 64 },
    { positionLabel: "ZM", x: 50, y: 62 },
    { positionLabel: "RM", x: 80, y: 64 },
    { positionLabel: "ST", x: 50, y: 82 },
  ],
  "3-5-2": [
    { positionLabel: "TW", x: 50, y: 8 },
    { positionLabel: "IV", x: 28, y: 28 },
    { positionLabel: "IV", x: 50, y: 24 },
    { positionLabel: "IV", x: 72, y: 28 },
    { positionLabel: "LWB", x: 12, y: 52 },
    { positionLabel: "ZM", x: 35, y: 50 },
    { positionLabel: "ZM", x: 50, y: 46 },
    { positionLabel: "ZM", x: 65, y: 50 },
    { positionLabel: "RWB", x: 88, y: 52 },
    { positionLabel: "ST", x: 40, y: 78 },
    { positionLabel: "ST", x: 60, y: 78 },
  ],
};

export function slotsForTemplate(
  templateKey: string
): Omit<FormationPlayerPos, "playerId">[] {
  return (
    LAYOUTS[templateKey] ??
    LAYOUTS["4-4-2"] ?? [
      { positionLabel: "TW", x: 50, y: 8 },
    ]
  );
}

export function emptyPositionsFromTemplate(
  templateKey: string
): FormationPlayerPos[] {
  return slotsForTemplate(templateKey).map((slot) => ({
    ...slot,
    playerId: "",
  }));
}

/** Defensiv: leicht nach hinten verschoben. */
export function defensiveFromOffensive(
  positions: FormationPlayerPos[]
): FormationPlayerPos[] {
  return positions.map((p) => ({
    ...p,
    y: Math.max(4, Math.min(92, p.y - 8)),
  }));
}
