import { useEffect, useMemo, useState } from "react";
import { createPlayer, listPlayers } from "../lib/local/repository";
import type { Player } from "../lib/types";
import ClubPicker from "./ClubPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PlayerPickerProps {
  label?: string;
  value: string | undefined;
  onChange: (playerId: string, player: Player) => void;
}

export default function PlayerPicker({
  label = "Spieler",
  value,
  onChange,
}: PlayerPickerProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [clubId, setClubId] = useState<string | undefined>(undefined);

  const reload = async () => setPlayers(await listPlayers());

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return players;
    const q = query.toLowerCase();
    return players.filter(
      (p) =>
        p.vorname.toLowerCase().includes(q) ||
        p.nachname.toLowerCase().includes(q)
    );
  }, [players, query]);

  const selected = players.find((p) => p.id === value);

  const handleCreate = async () => {
    if (!vorname.trim() || !nachname.trim()) return;
    const player = await createPlayer({
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      positionen: [],
      aktuellerClubId: clubId,
    });
    await reload();
    onChange(player.id, player);
    setVorname("");
    setNachname("");
    setClubId(undefined);
    setCreating(false);
    setQuery("");
  };

  const clearSelection = () => {
    onChange("", undefined as unknown as Player);
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {selected && !creating ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <span className="font-medium truncate">
            {selected.vorname} {selected.nachname}
          </span>
          <Button type="button" variant="link" size="sm" onClick={clearSelection}>
            ändern
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            type="search"
            placeholder="Spieler suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtered.length > 0 && (
            <ul className="max-h-44 md:max-h-56 overflow-auto rounded-xl border border-border divide-y divide-border bg-card">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors"
                    onClick={() => {
                      onChange(p.id, p);
                      setQuery("");
                    }}
                  >
                    <span className="font-medium">
                      {p.vorname} {p.nachname}
                    </span>
                    {p.positionen.length > 0 && (
                      <span className="text-muted-foreground ml-2">
                        {p.positionen.join(", ")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!creating ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-0 h-auto"
              onClick={() => setCreating(true)}
            >
              + Neuen Spieler anlegen
            </Button>
          ) : (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3 md:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  type="text"
                  placeholder="Vorname"
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Nachname"
                  value={nachname}
                  onChange={(e) => setNachname(e.target.value)}
                />
              </div>
              <ClubPicker
                label="Aktueller Verein (optional)"
                value={clubId}
                onChange={(id) => setClubId(id || undefined)}
              />
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreating(false)}
                >
                  Abbrechen
                </Button>
                <Button type="button" onClick={handleCreate}>
                  Spieler anlegen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
