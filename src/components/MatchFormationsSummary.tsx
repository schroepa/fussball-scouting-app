import { matchHasFormations, summarizeMatchFormations } from "@/lib/match/formations";
import type { Match } from "@/lib/types";

export default function MatchFormationsSummary({
  match,
}: {
  match: Match | undefined;
}) {
  if (!match || !matchHasFormations(match)) return null;

  const phases = [...(match.phases ?? [])].sort(
    (a, b) => a.abMinute - b.abMinute
  );

  return (
    <div className="panel p-4 space-y-3 text-sm">
      <div>
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Formationen (Spiel)
        </div>
        <div className="font-medium mt-1">{summarizeMatchFormations(match)}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Heim off / def</div>
          <div className="font-medium">
            {match.formationHeimOff || "-"}
            {" / "}
            {match.formationHeimDef || "-"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Gast off / def</div>
          <div className="font-medium">
            {match.formationGastOff || "-"}
            {" / "}
            {match.formationGastDef || "-"}
          </div>
        </div>
      </div>

      {phases.length > 0 ? (
        <ul className="space-y-1.5 border-t border-border pt-2">
          {phases.map((p) => (
            <li key={p.id} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                ab {p.abMinute}&apos;
              </span>
              {" · "}
              Heim {p.formationHeimOff || "-"}/{p.formationHeimDef || "-"}
              {" · "}
              Gast {p.formationGastOff || "-"}/{p.formationGastDef || "-"}
              {p.notiz ? `, ${p.notiz}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
