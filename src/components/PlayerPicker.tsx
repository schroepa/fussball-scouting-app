import { useEffect, useMemo, useState } from "react";
import { createPlayer, listPlayers } from "../lib/local/repository";
import type { Player } from "../lib/types";
import ClubPicker from "./ClubPicker";

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

  return (
    <div>
      <label className="block font-medium text-slate-800 mb-1">{label}</label>
      {selected && !creating ? (
        <div className="flex items-center justify-between rounded-lg border border-slate-300 px-3 py-2">
          <span>
            {selected.vorname} {selected.nachname}
          </span>
          <button
            type="button"
            className="text-xs text-emerald-700 underline"
            onClick={() => onChange("", undefined as unknown as Player)}
          >
            ändern
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder="Spieler suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-1"
          />
          {filtered.length > 0 && (
            <ul className="max-h-40 overflow-auto border border-slate-200 rounded-lg divide-y">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-50"
                    onClick={() => {
                      onChange(p.id, p);
                      setQuery("");
                    }}
                  >
                    {p.vorname} {p.nachname}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!creating ? (
            <button
              type="button"
              className="text-sm text-emerald-700 underline mt-1"
              onClick={() => setCreating(true)}
            >
              + Neuen Spieler anlegen
            </button>
          ) : (
            <div className="space-y-2 mt-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Vorname"
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Nachname"
                  value={nachname}
                  onChange={(e) => setNachname(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <ClubPicker
                label="Aktueller Verein (optional)"
                value={clubId}
                onChange={(id) => setClubId(id || undefined)}
              />
              <button
                type="button"
                onClick={handleCreate}
                className="w-full rounded-lg bg-emerald-600 text-white py-2 font-medium"
              >
                Spieler anlegen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
