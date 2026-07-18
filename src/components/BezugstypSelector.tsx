import type { Bezugstyp } from "../lib/types";
import { BEZUGSTYP_LABELS } from "../lib/types";
import MatchPicker from "./MatchPicker";

interface BezugstypSelectorProps {
  bezugstyp: Bezugstyp;
  matchId: string | undefined;
  onBezugstypChange: (value: Bezugstyp) => void;
  onMatchChange: (matchId: string) => void;
}

const OPTIONS: { value: Bezugstyp; icon: string }[] = [
  { value: "spiel", icon: "⚽" },
  { value: "training", icon: "🏋️" },
  { value: "sonstige_beobachtung", icon: "👁️" },
];

/**
 * Pflichtfeld: worauf bezieht sich dieser Bericht? Diese Auswahl wird auch
 * in Liste/Detail als Badge angezeigt (s. docs/PLANNING.md, Abschnitt 3),
 * damit auf einen Blick klar ist, ob ein Bericht spielgebunden oder eine
 * freie Beobachtung ist.
 */
export default function BezugstypSelector({
  bezugstyp,
  matchId,
  onBezugstypChange,
  onMatchChange,
}: BezugstypSelectorProps) {
  return (
    <div>
      <label className="block font-medium text-slate-800 mb-1">
        Bezug dieses Berichts
      </label>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onBezugstypChange(opt.value)}
            className={`rounded-lg border-2 py-2 px-1 text-xs font-medium flex flex-col items-center gap-1 ${
              bezugstyp === opt.value
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-slate-200 text-slate-600"
            }`}
          >
            <span className="text-lg">{opt.icon}</span>
            {BEZUGSTYP_LABELS[opt.value]}
          </button>
        ))}
      </div>
      {bezugstyp === "spiel" && (
        <MatchPicker value={matchId} onChange={onMatchChange} />
      )}
    </div>
  );
}
