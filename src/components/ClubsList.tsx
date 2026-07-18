import { useEffect, useState } from "react";
import { listClubs } from "../lib/local/repository";
import type { Club } from "../lib/types";

export default function ClubsList() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listClubs().then(setClubs);
  }, []);

  const filtered = clubs.filter((c) =>
    query.trim() ? c.name.toLowerCase().includes(query.toLowerCase()) : true
  );

  return (
    <div>
      <input
        type="text"
        placeholder="Verein suchen…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-4"
      />
      {filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Noch keine Vereine angelegt. Lege beim Anlegen eines Berichts einen neuen
          Verein an.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-slate-200 p-3 flex items-center justify-between"
            >
              <div className="font-semibold text-slate-800">{c.name}</div>
              {c.liga && <span className="text-sm text-slate-500">{c.liga}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
