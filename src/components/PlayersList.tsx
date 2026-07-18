import { useEffect, useMemo, useState } from "react";
import { listClubs, listPlayers, listPlayerReports } from "../lib/local/repository";
import type { Club, Player, PlayerReport } from "../lib/types";

export default function PlayersList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [reports, setReports] = useState<PlayerReport[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const [pl, cl, rp] = await Promise.all([
        listPlayers(),
        listClubs(),
        listPlayerReports(),
      ]);
      setPlayers(pl);
      setClubs(cl);
      setReports(rp);
    })();
  }, []);

  const clubById = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs]);
  const reportCountByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reports) {
      map.set(r.playerId, (map.get(r.playerId) ?? 0) + 1);
    }
    return map;
  }, [reports]);

  const filtered = players.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.vorname.toLowerCase().includes(q) || p.nachname.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Spieler suchen…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-4"
      />
      {filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Noch keine Spieler angelegt. Lege beim Anlegen eines Berichts einen neuen
          Spieler an.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => {
            const club = p.aktuellerClubId ? clubById.get(p.aktuellerClubId) : undefined;
            const count = reportCountByPlayer.get(p.id) ?? 0;
            return (
              <li
                key={p.id}
                className="rounded-xl border border-slate-200 p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-800">
                    {p.vorname} {p.nachname}
                  </div>
                  {club && <div className="text-sm text-slate-500">{club.name}</div>}
                </div>
                <span className="text-xs text-slate-400">
                  {count} Bericht{count === 1 ? "" : "e"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
