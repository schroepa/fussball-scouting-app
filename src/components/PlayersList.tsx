import { useEffect, useMemo, useState } from "react";
import { listClubs, listPlayers, listPlayerReports } from "../lib/local/repository";
import type { Club, Player, PlayerReport } from "../lib/types";
import CreatePlayerForm from "./CreatePlayerForm";

export default function PlayersList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [reports, setReports] = useState<PlayerReport[]>([]);
  const [query, setQuery] = useState("");

  const reload = async () => {
    const [pl, cl, rp] = await Promise.all([
      listPlayers(),
      listClubs(),
      listPlayerReports(),
    ]);
    setPlayers(pl);
    setClubs(cl);
    setReports(rp);
  };

  useEffect(() => {
    reload();
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
    <div className="space-y-4">
      <CreatePlayerForm onCreated={reload} />

      <a
        href="/import"
        className="block rounded-lg border border-slate-300 px-4 py-2.5 text-center font-medium text-slate-700"
      >
        ⬇ Spieler/Vereine von API importieren
      </a>

      <input
        type="text"
        placeholder="Gespeicherte Spieler filtern…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />

      {filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Noch keine Spieler gespeichert. Lege einen manuell an oder importiere
          von der API.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => {
            const club = p.aktuellerClubId
              ? clubById.get(p.aktuellerClubId)
              : undefined;
            const count = reportCountByPlayer.get(p.id) ?? 0;
            return (
              <li
                key={p.id}
                className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 truncate">
                    {p.vorname} {p.nachname}
                  </div>
                  <div className="text-sm text-slate-500 truncate">
                    {[club?.name, p.positionen.join(", "), p.externalSource]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-400">
                    {count} Bericht{count === 1 ? "" : "e"}
                  </div>
                  <a
                    href={`/reports/new-player`}
                    className="text-xs text-emerald-700 underline"
                  >
                    Bewerten
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
