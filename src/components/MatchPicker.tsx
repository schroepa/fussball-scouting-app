import { useEffect, useMemo, useState } from "react";
import { createMatch, listMatches } from "../lib/local/repository";
import type { Match } from "../lib/types";
import { matchHasFormations, summarizeMatchFormations } from "../lib/match/formations";
import { matchHasVideo, summarizeMatchVideo } from "../lib/match/video";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";
import MatchFormationsEditor from "./MatchFormationsEditor";
import MatchVideoEditor from "./MatchVideoEditor";

interface MatchPickerProps {
  value: string | undefined;
  onChange: (matchId: string) => void;
}

function formatMatch(m: Match): string {
  const date = new Date(m.datum).toLocaleDateString("de-DE");
  return `${m.heimClubName} vs. ${m.gastClubName} (${date})`;
}

type Panel = "none" | "formations" | "video";

export default function MatchPicker({ value, onChange }: MatchPickerProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [creating, setCreating] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
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
    setPanel("none");
  }, [value]);

  const handleCreate = async () => {
    if (!heim.trim() || !gast.trim()) return;
    const match = await createMatch({
      heimClubName: heim.trim(),
      gastClubName: gast.trim(),
      datum: new Date(datum).toISOString(),
      wettbewerb: wettbewerb.trim() || undefined,
      phases: [],
      videoMarkers: [],
    });
    await reload();
    onChange(match.id);
    setCreating(false);
    setHeim("");
    setGast("");
    setWettbewerb("");
    setPanel("formations");
  };

  return (
    <div className="space-y-1.5">
      <Label>Spiel</Label>
      {selected && !creating ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
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

          {panel === "none" ? (
            <div className="space-y-1.5 px-0.5">
              {matchHasFormations(selected) ? (
                <p className="text-xs text-muted-foreground">
                  {summarizeMatchFormations(selected)}
                </p>
              ) : null}
              {matchHasVideo(selected) ? (
                <p className="text-xs text-muted-foreground">
                  {summarizeMatchVideo(selected)}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPanel("formations")}
                >
                  Formationen & Phasen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPanel("video")}
                >
                  Video / VEO
                </Button>
              </div>
            </div>
          ) : null}

          {panel === "formations" ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="px-0 h-auto"
                onClick={() => setPanel("none")}
              >
                ← Zurück
              </Button>
              <MatchFormationsEditor
                match={selected}
                compact
                onSaved={async (m) => {
                  await reload();
                  onChange(m.id);
                }}
              />
            </div>
          ) : null}

          {panel === "video" ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="px-0 h-auto"
                onClick={() => setPanel("none")}
              >
                ← Zurück
              </Button>
              <MatchVideoEditor
                match={selected}
                compact
                onSaved={async (m) => {
                  await reload();
                  onChange(m.id);
                }}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          {matches.length > 0 && !creating && (
            <SimpleSelect
              value={value ?? ""}
              onValueChange={(next) => {
                if (next) onChange(next);
              }}
              placeholder="Spiel auswählen…"
              options={matches.map((m) => ({
                value: m.id,
                label: formatMatch(m),
              }))}
            />
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
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 md:p-4">
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
