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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    const load = async () => {
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
    };
    void load();
    window.addEventListener("scouting:synced", load);
    return () => window.removeEventListener("scouting:synced", load);
  }, []);

  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players]
  );
  const clubById = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs]);
  const matchById = useMemo(
    () => new Map(matches.map((m) => [m.id, m])),
    [matches]
  );

  interface Row {
    id: string;
    kind: "spieler" | "team";
    datum: string;
    title: string;
    syncStatus: PlayerReport["syncStatus"];
    badges: React.ReactNode;
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
        title: player
          ? `${player.vorname} ${player.nachname}`
          : "Unbekannter Spieler",
        syncStatus: r.syncStatus,
        href: `/reports/player/${r.id}`,
        badges: (
          <>
            <BezugstypBadge bezugstyp={r.bezugstyp} match={match} />
            <SyncStatusBadge status={r.syncStatus} />
          </>
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
        badges: (
          <>
            <BerichtsartBadge berichtsart={r.berichtsart} />
            <BezugstypBadge bezugstyp={r.bezugstyp} match={match} />
            <SyncStatusBadge status={r.syncStatus} />
          </>
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
    return <p className="text-muted-foreground text-sm">Lade Berichte…</p>;
  }

  const filters = [
    { key: "alle" as const, label: "Alle" },
    { key: "spieler" as const, label: "Spieler" },
    { key: "team" as const, label: "Team" },
  ];

  return (
    <div className="space-y-4">
      <div className="seg-control w-fit" role="group" aria-label="Berichtstyp filtern">
        {filters.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={
              filter === opt.key
                ? "seg-control__thumb px-3.5 py-2 text-xs min-h-9 focus-ring"
                : "seg-control__item px-3.5 py-2 text-xs min-h-9 focus-ring"
            }
            aria-pressed={filter === opt.key}
            onClick={() => setFilter(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filteredRows.length === 0 ? (
        <div className="panel px-5 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            Noch keine Berichte erfasst. Lege einen neuen Bericht an.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="space-y-3 md:hidden">
            {filteredRows.map((row) => (
              <li key={row.id}>
                <a
                  href={row.href}
                  className="panel block p-4 hover:bg-muted/30 focus-ring transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-card-foreground truncate">
                      {row.kind === "spieler" ? "Spieler" : "Team"} · {row.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {new Date(row.datum).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">{row.badges}</div>
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop: quiet table panel */}
          <div className="hidden md:block panel overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="w-[100px] label-caps font-medium h-11">
                    Typ
                  </TableHead>
                  <TableHead className="label-caps font-medium h-11">Name</TableHead>
                  <TableHead className="label-caps font-medium h-11">Datum</TableHead>
                  <TableHead className="label-caps font-medium h-11">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 border-border">
                    <TableCell className="font-medium capitalize p-0">
                      <a
                        href={row.href}
                        className="block px-4 py-3.5 text-inherit no-underline min-h-11"
                        aria-label={`${row.kind === "spieler" ? "Spielerbericht" : "Teambericht"} öffnen: ${row.title}`}
                      >
                        {row.kind}
                      </a>
                    </TableCell>
                    <TableCell className="p-0">
                      <a
                        href={row.href}
                        className="block px-4 py-3.5 text-inherit no-underline"
                        tabIndex={-1}
                      >
                        <div className="font-medium">{row.title}</div>
                        <div className="flex flex-wrap gap-1.5 mt-1">{row.badges}</div>
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap p-0">
                      <a
                        href={row.href}
                        className="block px-4 py-3.5 text-inherit no-underline tabular-nums"
                        tabIndex={-1}
                      >
                        {new Date(row.datum).toLocaleDateString("de-DE")}
                      </a>
                    </TableCell>
                    <TableCell className="p-0">
                      <a
                        href={row.href}
                        className="block px-4 py-3.5 text-inherit no-underline"
                        tabIndex={-1}
                      >
                        <SyncStatusBadge status={row.syncStatus} />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
