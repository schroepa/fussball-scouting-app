import type { Match, MatchPhase } from "../types";

/** Häufige Systeme, Chips am Spielfeldrand. */
export const COMMON_FORMATIONS = [
  "4-4-2",
  "4-3-3",
  "4-2-3-1",
  "4-1-4-1",
  "3-5-2",
  "3-4-3",
  "3-4-2-1",
  "5-3-2",
  "5-4-1",
  "4-5-1",
] as const;

export type FormationSlot =
  | "formationHeimOff"
  | "formationHeimDef"
  | "formationGastOff"
  | "formationGastDef";

export const FORMATION_SLOT_LABELS: Record<FormationSlot, string> = {
  formationHeimOff: "Heim · offensiv",
  formationHeimDef: "Heim · defensiv",
  formationGastOff: "Gast · offensiv",
  formationGastDef: "Gast · defensiv",
};

export function emptyPhases(): MatchPhase[] {
  return [];
}

export function sortPhases(phases: MatchPhase[]): MatchPhase[] {
  return [...phases].sort((a, b) => a.abMinute - b.abMinute);
}

export function matchHasFormations(match: Match | undefined | null): boolean {
  if (!match) return false;
  return Boolean(
    match.formationHeimOff ||
      match.formationHeimDef ||
      match.formationGastOff ||
      match.formationGastDef ||
      (match.phases && match.phases.length > 0)
  );
}

export function formatFormationPair(
  off?: string,
  def?: string
): string | undefined {
  if (!off && !def) return undefined;
  if (off && def && off === def) return off;
  if (off && def) return `${off} / ${def}`;
  return off || def;
}

export function summarizeMatchFormations(match: Match): string {
  const heim = formatFormationPair(
    match.formationHeimOff,
    match.formationHeimDef
  );
  const gast = formatFormationPair(
    match.formationGastOff,
    match.formationGastDef
  );
  const parts: string[] = [];
  if (heim) parts.push(`Heim ${heim}`);
  if (gast) parts.push(`Gast ${gast}`);
  const phaseCount = match.phases?.length ?? 0;
  if (phaseCount > 0) {
    parts.push(`${phaseCount} Phase${phaseCount === 1 ? "" : "n"}`);
  }
  return parts.join(" · ") || "Keine Formationen";
}

export function parsePhasesFromRemote(value: unknown): MatchPhase[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw, index) => {
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Record<string, unknown>;
      const abMinute = Number(row.abMinute ?? row.ab_minute ?? 0);
      return {
        id: String(row.id ?? `phase-${index}`),
        abMinute: Number.isFinite(abMinute) ? abMinute : 0,
        formationHeimOff:
          (row.formationHeimOff as string | undefined) ??
          (row.formation_heim_off as string | undefined) ??
          undefined,
        formationHeimDef:
          (row.formationHeimDef as string | undefined) ??
          (row.formation_heim_def as string | undefined) ??
          undefined,
        formationGastOff:
          (row.formationGastOff as string | undefined) ??
          (row.formation_gast_off as string | undefined) ??
          undefined,
        formationGastDef:
          (row.formationGastDef as string | undefined) ??
          (row.formation_gast_def as string | undefined) ??
          undefined,
        notiz: (row.notiz as string | undefined) ?? undefined,
      } satisfies MatchPhase;
    })
    .filter((p): p is MatchPhase => p !== null);
}
