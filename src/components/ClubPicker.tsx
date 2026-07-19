import { useEffect, useMemo, useState } from "react";
import { createClub, listClubs } from "../lib/local/repository";
import type { Club } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClubPickerProps {
  label?: string;
  value: string | undefined;
  onChange: (clubId: string, club: Club) => void;
}

export default function ClubPicker({
  label = "Verein",
  value,
  onChange,
}: ClubPickerProps) {
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

  const clearSelection = () => {
    onChange("", undefined as unknown as Club);
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {selected && !creating ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <span className="font-medium truncate">{selected.name}</span>
          <Button type="button" variant="link" size="sm" onClick={clearSelection}>
            ändern
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            type="search"
            placeholder="Verein suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtered.length > 0 && (
            <ul className="max-h-44 md:max-h-56 overflow-auto rounded-xl border border-border divide-y divide-border bg-card">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors"
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
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-0 h-auto"
              onClick={() => {
                setCreating(true);
                setNewName(query);
              }}
            >
              + Neuen Verein anlegen
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 rounded-xl border border-border bg-muted/30 p-3">
              <Input
                type="text"
                placeholder="Vereinsname"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1"
              />
              <div className="flex gap-2">
                <Button type="button" onClick={handleCreate} className="flex-1 sm:flex-none">
                  Anlegen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreating(false)}
                  className="flex-1 sm:flex-none"
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
