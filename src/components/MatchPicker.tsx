import { useEffect, useMemo, useState } from "react";
import { createMatch, listMatches } from "../lib/local/repository";
import type { Match } from "../lib/types";
import { matchHasFormations, summarizeMatchFormations } from "../lib/match/formations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MatchFormationsEditor from "./MatchFormationsEditor";

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
  const [editFormations, setEditFormations] = useState(false);
  const [heim, setHeim] = useState("");
  const [gast, setGast] = useState("");
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [wettbewerb, setWettbewerb] = useState("");

  const reload = async () => setMatches(await listMatches());

  useEffect(() => {
    reload();
    const onSynced = () => {
      void reload();
    };
    window.addEventListener("scouting:synced", onSynced);
    return () => window.removeEventListener("scouting:synced", onSynced);
  }, []);

  const selected = useMemo(
    () => matches.find((m) => m.id === value),
    [matches, value]
  );

  useEffect(() => {
    setEditFormations(false);
  }, [value]);

  const handleCreate = async () => {
    if (!heim.trim() || !gast.trim()) return;
    const match = await createMatch({
      heimClubName: heim.trim(),
      gastClubName: gast.trim(),
      datum: new Date(datum).toISOString(),
      wettbewerb: wettbewerb.trim() || undefined,
      phases: [],
    });
    await reload();
    onChange(match.id);
    setCreating(false);
    setHeim("");
    setGast("");
    setWettbewerb("");
    setEditFormations(true);
  };

  return (
    <div className="space-y-1.5">
      <Label>Spiel</Label>
      {selected && !creating ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <span className="text-sm font-medium truncate">
              {formatMatch(selected)}
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => onChange("")}
            >
              ändern
            </Button>
          </div>

          {matchHasFormations(selected) && !editFormations ? (
            <p className="text-xs text-muted-foreground px-1">
              {summarizeMatchFormations(selected)}
            </p>
          ) : null}

          {!editFormations ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setEditFormations(true)}
            >
              Formationen & Phasen
            </Button>
          ) : (
            <MatchFormationsEditor
              match={selected}
              compact
              onSaved={async (m) => {
                await reload();
                onChange(m.id);
              }}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {matches.length > 0 && !creating && (
            <select
              className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
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
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-0 h-auto"
              onClick={() => setCreating(true)}
            >
              + Neues Spiel anlegen
            </Button>
          ) : (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3 md:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  type="text"
                  placeholder="Heimteam"
                  value={heim}
                  onChange={(e) => setHeim(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Gastteam"
                  value={gast}
                  onChange={(e) => setGast(e.target.value)}
                />
                <Input
                  type="date"
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Wettbewerb (optional)"
                  value={wettbewerb}
                  onChange={(e) => setWettbewerb(e.target.value)}
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreating(false)}
                >
                  Abbrechen
                </Button>
                <Button type="button" onClick={handleCreate}>
                  Spiel anlegen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
