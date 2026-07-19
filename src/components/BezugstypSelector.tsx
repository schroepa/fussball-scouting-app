import type { Bezugstyp } from "../lib/types";
import { BEZUGSTYP_LABELS } from "../lib/types";
import MatchPicker from "./MatchPicker";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ClipboardList, Dumbbell, Trophy } from "lucide-react";

interface BezugstypSelectorProps {
  bezugstyp: Bezugstyp;
  matchId: string | undefined;
  onBezugstypChange: (value: Bezugstyp) => void;
  onMatchChange: (matchId: string) => void;
}

const OPTIONS: {
  value: Bezugstyp;
  Icon: typeof Trophy;
}[] = [
  { value: "spiel", Icon: Trophy },
  { value: "training", Icon: Dumbbell },
  { value: "sonstige_beobachtung", Icon: ClipboardList },
];

/**
 * Pflichtfeld: worauf bezieht sich dieser Bericht? Diese Auswahl wird auch
 * in Liste/Detail als Badge angezeigt (s. docs/PLANNING.md, Abschnitt 3).
 */
export default function BezugstypSelector({
  bezugstyp,
  matchId,
  onBezugstypChange,
  onMatchChange,
}: BezugstypSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Bezug dieses Berichts</Label>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ value, Icon }) => {
          const active = bezugstyp === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onBezugstypChange(value)}
              className={cn(
                "rounded-xl border px-2 py-2.5 text-xs font-medium flex flex-col items-center gap-1.5 transition-colors md:text-sm md:py-3",
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Icon className={cn("size-4 md:size-5", active && "text-primary")} />
              <span className="text-center leading-tight">
                {BEZUGSTYP_LABELS[value]}
              </span>
            </button>
          );
        })}
      </div>
      {bezugstyp === "spiel" && (
        <MatchPicker value={matchId} onChange={onMatchChange} />
      )}
    </div>
  );
}
