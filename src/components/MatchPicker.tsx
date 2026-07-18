import { useEffect, useMemo, useState } from "react";
import { createMatch, listMatches } from "../lib/local/repository";
import type { Match } from "../lib/types";

interface MatchPickerProps {
  value: string | undefined;
  onChange: (matchId: string) => void;
}

function formatMatch(m: Match): string {
  const date = new Date(m.datum).toLocaleDateString("de-DE");
  return `${m.heimClubName} vs. ${m.gastClubName} (${date})`;
}

export default function MatchPicker({ value, onChange }: MatchPickerProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [creating, setCreating] = useState(false);
  const [heim, setHeim] = useState("");
  const [gast, setGast] = useState("");
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [wettbewerb, setWettbewerb] = useState("");

  const reload = async () => setMatches(await listMatches());

  useEffect(() => {
    reload();
  }, []);

  const selected = useMemo(() => matches.find((m) => m.id === value), [matches, value]);

  const handleCreate = async () => {
    if (!heim.trim() || !gast.trim()) return;
    const match = await createMatch({
      heimClubName: heim.trim(),
      gastClubName: gast.trim(),
      datum: new Date(datum).toISOString(),
      wettbewerb: wettbewerb.trim() || undefined,
    });
    await reload();
    onChange(match.id);
    setCreating(false);
    setHeim("");
    setGast("");
    setWettbewerb("");
  };

  return (
    <div>
      <label className="block font-medium text-slate-800 mb-1">Spiel</label>
      {selected && !creating ? (
        <div className="flex items-center justify-between rounded-lg border border-slate-300 px-3 py-2">
          <span>{formatMatch(selected)}</span>
          <button
            type="button"
            className="text-xs text-emerald-700 underline"
            onClick={() => onChange("")}
          >
            ändern
          </button>
        </div>
      ) : (
        <div>
          {matches.length > 0 && !creating && (
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-2"
              value={value ?? ""}
              onChange={(e) => e.target.value && onChange(e.target.value)}
            >
              <option value="">Spiel auswählen…</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatMatch(m)}
                </option>
              ))}
            </select>
          )}
          {!creating ? (
            <button
              type="button"
              className="text-sm text-emerald-700 underline"
              onClick={() => setCreating(true)}
            >
              + Neues Spiel anlegen
            </button>
          ) : (
            <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Heimteam"
                  value={heim}
                  onChange={(e) => setHeim(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Gastteam"
                  value={gast}
                  onChange={(e) => setGast(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Wettbewerb (optional)"
                  value={wettbewerb}
                  onChange={(e) => setWettbewerb(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <button
                type="button"
                onClick={handleCreate}
                className="w-full rounded-lg bg-emerald-600 text-white py-2 font-medium"
              >
                Spiel anlegen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
