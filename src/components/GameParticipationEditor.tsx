import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";
import {
  deleteGameParticipation,
  listGameParticipations,
  listSquadPlayers,
  upsertGameParticipation,
} from "../lib/local/trainerRepository";
import type {
  GameParticipation,
  ParticipationRole,
  Player,
} from "../lib/types";
import { PARTICIPATION_ROLE_LABELS } from "../lib/types";

/** Ist-Teilnahme am Spiel (getrennt von Soll-Aufstellung). */
export default function GameParticipationEditor({
  gameId,
  teamId,
}: {
  gameId: string;
  teamId?: string;
}) {
  const [rows, setRows] = useState<GameParticipation[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [position, setPosition] = useState("");
  const [rolle, setRolle] = useState<ParticipationRole>("startxi");
  const [von, setVon] = useState("0");
  const [bis, setBis] = useState("90");

  const reload = async () => {
    const [parts, squad] = await Promise.all([
      listGameParticipations(gameId),
      teamId ? listSquadPlayers(teamId) : Promise.resolve([]),
    ]);
    setRows(parts);
    setPlayers(squad.map((s) => s.player));
  };

  useEffect(() => {
    void reload();
  }, [gameId, teamId]);

  const nameOf = (id: string) => {
    const p = players.find((x) => x.id === id);
    return p ? `${p.nachname}, ${p.vorname}` : id.slice(0, 8);
  };

  return (
    <section id="section-game-participation" className="space-y-3">
      <h3 className="text-sm font-semibold">Spiel-Teilnahme (Ist)</h3>
      <p className="text-xs text-muted-foreground">
        Getrennt von der geplanten Aufstellung – für Entwicklungsstatistik.
      </p>
      <div className="grid gap-2 sm:grid-cols-5 rounded-lg border border-border bg-card p-3">
        <div className="sm:col-span-2 space-y-1">
          <Label>Spieler</Label>
          <SimpleSelect
            value={playerId}
            onValueChange={setPlayerId}
            placeholder="Spieler"
            options={players.map((p) => ({
              value: p.id,
              label: `${p.nachname}, ${p.vorname}`,
            }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Position</Label>
          <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="LV" />
        </div>
        <div className="space-y-1">
          <Label>Rolle</Label>
          <SimpleSelect
            value={rolle}
            onValueChange={(v) => setRolle(v as ParticipationRole)}
            options={[
              { value: "startxi", label: PARTICIPATION_ROLE_LABELS.startxi },
              { value: "bank", label: PARTICIPATION_ROLE_LABELS.bank },
              {
                value: "einwechslung",
                label: PARTICIPATION_ROLE_LABELS.einwechslung,
              },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Von</Label>
            <Input
              inputMode="numeric"
              value={von}
              onChange={(e) => setVon(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Bis</Label>
            <Input
              inputMode="numeric"
              value={bis}
              onChange={(e) => setBis(e.target.value)}
            />
          </div>
        </div>
        <div className="sm:col-span-5">
          <Button
            type="button"
            size="sm"
            disabled={!playerId}
            onClick={async () => {
              await upsertGameParticipation({
                gameId,
                teamId,
                playerId,
                position: position.trim() || undefined,
                rolle,
                minutenVon: Number(von) || 0,
                minutenBis: Number(bis) || 90,
              });
              setPlayerId("");
              setPosition("");
              await reload();
            }}
          >
            Speichern
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Teilnahmen.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>
                {nameOf(r.playerId)} · {r.position || "–"} ·{" "}
                {PARTICIPATION_ROLE_LABELS[r.rolle]} · {r.minutenVon ?? 0}–
                {r.minutenBis ?? 90}&apos;
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await deleteGameParticipation(r.id);
                  await reload();
                }}
              >
                Entfernen
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
