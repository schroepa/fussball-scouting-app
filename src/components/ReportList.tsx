import { useEffect, useMemo, useState } from "react";
import {
  listMatches,
  listPlayerReports,
  listPlayers,
  listClubs,
  listTeamReports,
} from "../lib/local/repository";
import type {
  Club,
  Match,
  Player,
  PlayerReport,
  TeamReport,
} from "../lib/types";
import {
  BerichtsartBadge,
  BezugstypBadge,
  SyncStatusBadge,
} from "./ReportBadges";

type FilterType = "alle" | "spieler" | "team";

export default function ReportList() {
  const [playerReports, setPlayerReports] = useState<PlayerReport[]>([]);
  const [teamReports, setTeamReports] = useState<TeamReport[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<FilterType>("alle");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [pr, tr, pl, cl, ma] = await Promise.all([
        listPlayerReports(),
        listTeamReports(),
        listPlayers(),
        listClubs(),
        listMatches(),
      ]);
      setPlayerReports(pr);
      setTeamReports(tr);
      setPlayers(pl);
      setClubs(cl);
      setMatches(ma);
      setLoading(false);
    })();
  }, []);

  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players]
  );
  const clubById = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs]);
  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);

  interface Row {
    id: string;
    kind: "spieler" | "team";
    datum: string;
    title: string;
    syncStatus: PlayerReport["syncStatus"];
    node: React.ReactNode;
    href: string;
  }

  const rows: Row[] = useMemo(() => {
    const pRows: Row[] = playerReports.map((r) => {
      const player = playerById.get(r.playerId);
      const match = r.matchId ? matchById.get(r.matchId) : undefined;
      return {
        id: r.id,
        kind: "spieler",
        datum: r.datum,
        title: player ? `${player.vorname} ${player.nachname}` : "Unbekannter Spieler",
        syncStatus: r.syncStatus,
        href: `/reports/player/${r.id}`,
        node: (
          <div className="flex flex-wrap gap-1.5 mt-1">
            <BezugstypBadge bezugstyp={r.bezugstyp} match={match} />
            <SyncStatusBadge status={r.syncStatus} />
          </div>
        ),
      };
    });

    const tRows: Row[] = teamReports.map((r) => {
      const club = clubById.get(r.clubId);
      const match = r.matchId ? matchById.get(r.matchId) : undefined;
      return {
        id: r.id,
        kind: "team",
        datum: r.datum,
        title: club ? club.name : "Unbekannter Verein",
        syncStatus: r.syncStatus,
        href: `/reports/team/${r.id}`,
        node: (
          <div className="flex flex-wrap gap-1.5 mt-1">
            <BerichtsartBadge berichtsart={r.berichtsart} />
            <BezugstypBadge bezugstyp={r.bezugstyp} match={match} />
            <SyncStatusBadge status={r.syncStatus} />
          </div>
        ),
      };
    });

    return [...pRows, ...tRows].sort(
      (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()
    );
  }, [playerReports, teamReports, playerById, clubById, matchById]);

  const filteredRows = rows.filter((r) => {
    if (filter === "alle") return true;
    if (filter === "spieler") return r.kind === "spieler";
    return r.kind === "team";
  });

  if (loading) {
    return <p className="text-slate-500 text-sm">Lade Berichte…</p>;
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(
          [
            { key: "alle", label: "Alle" },
            { key: "spieler", label: "Spieler" },
            { key: "team", label: "Team" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === opt.key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filteredRows.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Noch keine Berichte erfasst. Lege oben einen neuen Bericht an.
        </p>
      ) : (
        <ul className="space-y-2">
          {filteredRows.map((row) => (
            <li key={row.id}>
              <a
                href={row.href}
                className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {row.kind === "spieler" ? "🧍" : "🏟️"} {row.title}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(row.datum).toLocaleDateString("de-DE")}
                  </span>
                </div>
                {row.node}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
