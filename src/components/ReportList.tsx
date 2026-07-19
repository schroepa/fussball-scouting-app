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
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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
      <div className="flex flex-wrap gap-2">
        {filters.map((opt) => (
          <Button
            key={opt.key}
            type="button"
            size="sm"
            variant={filter === opt.key ? "default" : "outline"}
            onClick={() => setFilter(opt.key)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {filteredRows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Noch keine Berichte erfasst. Lege einen neuen Bericht an.
        </p>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="space-y-2 md:hidden">
            {filteredRows.map((row) => (
              <li key={row.id}>
                <a
                  href={row.href}
                  className="block rounded-xl border border-border bg-card p-3 hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-card-foreground truncate">
                      {row.kind === "spieler" ? "Spieler" : "Team"} · {row.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(row.datum).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">{row.badges}</div>
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Typ</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium capitalize">
                      {row.kind}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.title}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">{row.badges}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(row.datum).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell>
                      <SyncStatusBadge status={row.syncStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={row.href}
                        className={cn(
                          "text-sm font-medium text-primary hover:underline"
                        )}
                      >
                        Öffnen
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
