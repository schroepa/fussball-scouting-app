import { useEffect, useMemo, useState } from "react";
import { createPlayer, listClubs, listPlayers } from "../lib/local/repository";
import type { Club, Player } from "../lib/types";
import ClubPicker from "./ClubPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PlayerPickerProps {
  label?: string;
  value: string | undefined;
  onChange: (playerId: string, player: Player) => void;
}

function birthYear(geburtsdatum?: string): string | undefined {
  if (!geburtsdatum) return undefined;
  const y = geburtsdatum.slice(0, 4);
  return /^\d{4}$/.test(y) ? `Jg. ${y}` : undefined;
}

function playerSecondaryLine(p: Player, club?: Club): string {
  return [club?.name, birthYear(p.geburtsdatum), p.positionen.join(", ")]
    .filter(Boolean)
    .join(" · ");
}

function playerAriaLabel(p: Player, club?: Club): string {
  const parts = [
    `${p.vorname} ${p.nachname}`,
    club?.name,
    birthYear(p.geburtsdatum),
    p.positionen.length > 0 ? p.positionen.join(", ") : undefined,
  ].filter(Boolean);
  return parts.join(", ");
}

export default function PlayerPicker({
  label = "Spieler",
  value,
  onChange,
}: PlayerPickerProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [clubId, setClubId] = useState<string | undefined>(undefined);

  const reload = async () => {
    const [pl, cl] = await Promise.all([listPlayers(), listClubs()]);
    setPlayers(pl);
    setClubs(cl);
  };

  useEffect(() => {
    void reload();
  }, []);

  const clubById = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs]);

  const filtered = useMemo(() => {
    if (!query.trim()) return players;
    const q = query.toLowerCase();
    return players.filter(
      (p) =>
        p.vorname.toLowerCase().includes(q) ||
        p.nachname.toLowerCase().includes(q) ||
        (p.aktuellerClubId &&
          clubById.get(p.aktuellerClubId)?.name.toLowerCase().includes(q))
    );
  }, [players, query, clubById]);

  const selected = players.find((p) => p.id === value);
  const hasQuery = Boolean(query.trim());
  const noHits = hasQuery && filtered.length === 0;

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
          <div className="min-w-0">
            <div className="font-medium truncate">
              {selected.vorname} {selected.nachname}
            </div>
            {playerSecondaryLine(
              selected,
              selected.aktuellerClubId
                ? clubById.get(selected.aktuellerClubId)
                : undefined
            ) && (
              <div className="text-xs text-muted-foreground truncate">
                {playerSecondaryLine(
                  selected,
                  selected.aktuellerClubId
                    ? clubById.get(selected.aktuellerClubId)
                    : undefined
                )}
              </div>
            )}
          </div>
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
              {filtered.map((p) => {
                const club = p.aktuellerClubId
                  ? clubById.get(p.aktuellerClubId)
                  : undefined;
                const secondary = playerSecondaryLine(p, club);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors"
                      aria-label={playerAriaLabel(p, club)}
                      onClick={() => {
                        onChange(p.id, p);
                        setQuery("");
                      }}
                    >
                      <span className="font-medium">
                        {p.vorname} {p.nachname}
                      </span>
                      {secondary ? (
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {secondary}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {noHits && (
            <p className="text-sm text-muted-foreground px-0.5">
              Keine Treffer für „{query.trim()}“.
            </p>
          )}
          {!creating ? (
            <div
              className={
                filtered.length > 0
                  ? "pt-2 mt-1 border-t border-border"
                  : undefined
              }
            >
              <Button
                type="button"
                variant={noHits || filtered.length === 0 ? "outline" : "ghost"}
                size="sm"
                className={
                  noHits || filtered.length === 0
                    ? "w-full sm:w-auto"
                    : "px-0 h-auto text-muted-foreground"
                }
                onClick={() => setCreating(true)}
              >
                + Neuen Spieler anlegen
              </Button>
            </div>
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
