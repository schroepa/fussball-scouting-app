import { useEffect, useMemo, useState } from "react";
import { listClubs, listTeamReports } from "../../lib/local/repository";
import {
  buildTeamDashboardRows,
  type TeamDashboardRow,
} from "../../lib/dashboard/aggregates";
import type { Berichtsart, Bezugstyp } from "../../lib/types";
import { BERICHTSART_LABELS, BEZUGSTYP_LABELS } from "../../lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TeamDashboard() {
  const [rows, setRows] = useState<TeamDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [berichtsart, setBerichtsart] = useState<Berichtsart | "">("");
  const [bezugstyp, setBezugstyp] = useState<Bezugstyp | "">("");

  const load = async () => {
    const [clubs, reports] = await Promise.all([
      listClubs(),
      listTeamReports(),
    ]);
    let filteredReports = reports;
    if (berichtsart) {
      filteredReports = filteredReports.filter((r) => r.berichtsart === berichtsart);
    }
    if (bezugstyp) {
      filteredReports = filteredReports.filter((r) => r.bezugstyp === bezugstyp);
    }
    setRows(buildTeamDashboardRows(clubs, filteredReports));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    window.addEventListener("scouting:synced", load);
    return () => window.removeEventListener("scouting:synced", load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [berichtsart, bezugstyp]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.club.name.toLowerCase().includes(q) ||
        (r.club.liga?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, query]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Lade Team-Dashboard…</p>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card size="sm" className="shadow-sm">
          <CardHeader className="pb-0">
            <CardDescription>Vereine mit Berichten</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{filtered.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="shadow-sm">
          <CardHeader className="pb-0">
            <CardDescription>Team-Berichte gesamt</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {filtered.reduce((s, r) => s + r.reportCount, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="shadow-sm col-span-2 lg:col-span-1">
          <CardHeader className="pb-0">
            <CardDescription>Gegner / Eigen</CardDescription>
            <CardTitle className="text-lg tabular-nums">
              {filtered.reduce((s, r) => s + r.gegnerCount, 0)} /{" "}
              {filtered.reduce((s, r) => s + r.eigenCount, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card size="sm" className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col sm:flex-row flex-wrap gap-2">
          <Input
            type="search"
            placeholder="Verein / Liga suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={berichtsart === "" ? "default" : "outline"}
              onClick={() => setBerichtsart("")}
            >
              Alle Arten
            </Button>
            {(["gegner_analyse", "eigenes_team"] as Berichtsart[]).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={berichtsart === v ? "default" : "outline"}
                onClick={() => setBerichtsart(v)}
              >
                {BERICHTSART_LABELS[v]}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={bezugstyp === "" ? "default" : "outline"}
              onClick={() => setBezugstyp("")}
            >
              Alle Bezüge
            </Button>
            {(
              ["spiel", "training", "sonstige_beobachtung"] as Bezugstyp[]
            ).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={bezugstyp === v ? "default" : "outline"}
                onClick={() => setBezugstyp(v)}
              >
                {BEZUGSTYP_LABELS[v]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Noch keine Team-Berichte. Lege eine Gegner-Analyse oder Team-Analyse an.
        </p>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {filtered.map((row) => (
              <li
                key={row.club.id}
                className="rounded-xl border border-border bg-card p-3 space-y-2"
              >
                <div className="font-semibold">{row.club.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[row.club.liga, `${row.reportCount} Berichte`]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div className="text-xs">
                  Gegner {row.gegnerCount} · Eigen {row.eigenCount}
                  {row.lastFormation ? ` · ${row.lastFormation}` : ""}
                </div>
                {row.latest && (
                  <Button
                    size="sm"
                    variant="outline"
                    render={<a href={`/reports/team/${row.latest.id}`} />}
                  >
                    Letzter Bericht
                  </Button>
                )}
              </li>
            ))}
          </ul>

          <div className="hidden md:block rounded-xl border border-border overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Verein</TableHead>
                  <TableHead>Liga</TableHead>
                  <TableHead className="text-right">Berichte</TableHead>
                  <TableHead className="text-right">Gegner</TableHead>
                  <TableHead className="text-right">Eigen</TableHead>
                  <TableHead>Letzte Formation</TableHead>
                  <TableHead>Letztes Datum</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.club.id}>
                    <TableCell className="font-medium">{row.club.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.club.liga ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.reportCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.gegnerCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.eigenCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.lastFormation ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {row.latest
                        ? new Date(row.latest.datum).toLocaleDateString("de-DE")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.latest ? (
                        <a
                          href={`/reports/team/${row.latest.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Öffnen
                        </a>
                      ) : (
                        "—"
                      )}
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
