import { useEffect, useMemo, useState } from "react";
import { listClubs, listPlayers, listPlayerReports } from "../lib/local/repository";
import type { Club, Player, PlayerReport } from "../lib/types";
import CreatePlayerForm from "./CreatePlayerForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    const onSynced = () => {
      void reload();
    };
    window.addEventListener("scouting:synced", onSynced);
    return () => window.removeEventListener("scouting:synced", onSynced);
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
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 min-w-0 space-y-3">
          <CreatePlayerForm onCreated={reload} />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 lg:w-[22rem] lg:shrink-0">
          <Input
            type="search"
            placeholder="Spieler filtern…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" className="shrink-0" render={<a href="/import" />}>
            Import
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query.trim() ? "Keine Treffer für diesen Filter" : "Noch keine Spieler"}
          description={query.trim() ? undefined : "Lege einen Spieler manuell an oder importiere einen Kader."}
          action={
            !query.trim() ? (
              <Button variant="outline" size="sm" render={<a href="/import" />}>
                Kader importieren
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {filtered.map((p) => {
              const club = p.aktuellerClubId
                ? clubById.get(p.aktuellerClubId)
                : undefined;
              const count = reportCountByPlayer.get(p.id) ?? 0;
              return (
                <li
                  key={p.id}
                  className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-card-foreground truncate">
                      {p.vorname} {p.nachname}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {[club?.name, p.positionen.join(", "), p.externalSource]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="text-xs text-muted-foreground">
                      {count} Bericht{count === 1 ? "" : "e"}
                    </div>
                    <a
                      href={`/dashboard/players/${p.id}`}
                      className="block text-xs text-primary font-medium hover:underline"
                      aria-label={`Verlauf: ${p.vorname} ${p.nachname}`}
                    >
                      Verlauf
                    </a>
                    <a
                      href={`/reports/new-player?player=${encodeURIComponent(p.id)}`}
                      className="block text-xs text-muted-foreground hover:underline"
                      aria-label={`Bewerten: ${p.vorname} ${p.nachname}`}
                    >
                      Bewerten
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="hidden md:block rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Verein</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Quelle</TableHead>
                  <TableHead className="text-right">Berichte</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const club = p.aktuellerClubId
                    ? clubById.get(p.aktuellerClubId)
                    : undefined;
                  const count = reportCountByPlayer.get(p.id) ?? 0;
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">
                        {p.vorname} {p.nachname}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {club?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.positionen.join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {p.externalSource ?? "manuell"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {count}
                      </TableCell>
                      <TableCell className="text-right space-x-3">
                        <a
                          href={`/dashboard/players/${p.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                          aria-label={`Verlauf: ${p.vorname} ${p.nachname}`}
                        >
                          Verlauf
                        </a>
                        <a
                          href={`/reports/new-player?player=${encodeURIComponent(p.id)}`}
                          className="text-sm text-muted-foreground hover:underline"
                          aria-label={`Bewerten: ${p.vorname} ${p.nachname}`}
                        >
                          Bewerten
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
