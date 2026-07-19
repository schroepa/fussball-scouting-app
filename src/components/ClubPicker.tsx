import { useEffect, useMemo, useState } from "react";
import { createClub, listClubs } from "../lib/local/repository";
import type { Club } from "../lib/types";

interface ClubPickerProps {
  label?: string;
  value: string | undefined;
  onChange: (clubId: string, club: Club) => void;
}

export default function ClubPicker({ label = "Verein", value, onChange }: ClubPickerProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const reload = async () => setClubs(await listClubs());

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return clubs;
    const q = query.toLowerCase();
    return clubs.filter((c) => c.name.toLowerCase().includes(q));
  }, [clubs, query]);

  const selected = clubs.find((c) => c.id === value);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const club = await createClub({ name: newName.trim(), land: "Deutschland" });
    await reload();
    onChange(club.id, club);
    setNewName("");
    setCreating(false);
    setQuery("");
  };

  return (
    <div>
      <label className="block font-medium text-slate-800 mb-1">{label}</label>
      {selected && !creating ? (
        <div className="flex items-center justify-between rounded-lg border border-slate-300 px-3 py-2">
          <span>{selected.name}</span>
          <button
            type="button"
            className="text-xs text-emerald-700 underline"
            onClick={() => onChange("", undefined as unknown as Club)}
          >
            ändern
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder="Verein suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-1"
          />
          {filtered.length > 0 && (
            <ul className="max-h-40 overflow-auto border border-slate-200 rounded-lg divide-y">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-50"
                    onClick={() => {
                      onChange(c.id, c);
                      setQuery("");
                    }}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!creating ? (
            <button
              type="button"
              className="text-sm text-emerald-700 underline mt-1"
              onClick={() => {
                setCreating(true);
                setNewName(query);
              }}
            >
              + Neuen Verein anlegen
            </button>
          ) : (
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                placeholder="Vereinsname"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
              <button
                type="button"
                onClick={handleCreate}
                className="rounded-lg bg-emerald-600 text-white px-3 font-medium"
              >
                Anlegen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
