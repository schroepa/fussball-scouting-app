import { useEffect, useMemo, useState } from "react";
import {
  listAttributeDefinitions,
  listClubs,
  listPlayerReports,
  listPlayers,
} from "../../lib/local/repository";
import {
  AGE_BUCKET_LABELS,
  type AgeBucket,
  attributeKeys,
  buildPlayerDashboardRows,
  type PlayerDashboardRow,
} from "../../lib/dashboard/aggregates";
import type { AttributeDefinition, Empfehlung } from "../../lib/types";
import { EMPFEHLUNG_LABELS } from "../../lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { SimpleSelect } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const EMPFEHLUNG_OPTIONS: Empfehlung[] = [
  "unbedingt_beobachten",
  "im_blick_behalten",
  "kein_potenzial",
];

export default function PlayerDashboard() {
  const [rows, setRows] = useState<PlayerDashboardRow[]>([]);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<string>("");
  const [age, setAge] = useState<AgeBucket | "">("");
  const [liga, setLiga] = useState("");
  const [minGesamt, setMinGesamt] = useState(0);
  const [empfehlung, setEmpfehlung] = useState<Empfehlung | "">("");
  const [onlyWithReports, setOnlyWithReports] = useState(true);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const load = async () => {
    const [players, reports, clubs, defs] = await Promise.all([
      listPlayers(),
      listPlayerReports(),
      listClubs(),
      listAttributeDefinitions("player"),
    ]);
    setAttributes(defs);
    setRows(
      buildPlayerDashboardRows(players, reports, clubs, attributeKeys(defs))
    );
    setLoading(false);
  };

  useEffect(() => {
    void load();
    window.addEventListener("scouting:synced", load);
    return () => window.removeEventListener("scouting:synced", load);
  }, []);

  const positions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      for (const p of row.player.positionen) {
        if (p.trim()) set.add(p.trim());
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "de"));
  }, [rows]);

  const ligen = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (row.liga?.trim()) set.add(row.liga.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "de"));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (onlyWithReports && row.reportCount === 0) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const name =
          `${row.player.vorname} ${row.player.nachname}`.toLowerCase();
        if (!name.includes(q)) return false;
      }
      if (position && !row.player.positionen.includes(position)) return false;
      if (age && row.ageBucket !== age) return false;
      if (liga && row.liga !== liga) return false;
      if (minGesamt > 0) {
        const g = row.latestGesamt ?? row.avgGesamt;
        if (g == null || g < minGesamt) return false;
      }
      if (empfehlung && row.latestEmpfehlung !== empfehlung) return false;
      return true;
    });
  }, [rows, query, position, age, liga, minGesamt, empfehlung, onlyWithReports]);

  const summary = useMemo(() => {
    const withReports = filtered.filter((r) => r.reportCount > 0);
    const gesamtValues = withReports
      .map((r) => r.avgGesamt ?? r.latestGesamt)
      .filter((v): v is number => typeof v === "number");
    const avg =
      gesamtValues.length > 0
        ? Math.round(
            (gesamtValues.reduce((a, b) => a + b, 0) / gesamtValues.length) * 10
          ) / 10
        : undefined;
    const empCounts: Record<string, number> = {};
    for (const r of withReports) {
      if (!r.latestEmpfehlung) continue;
      empCounts[r.latestEmpfehlung] = (empCounts[r.latestEmpfehlung] ?? 0) + 1;
    }
    return {
      players: filtered.length,
      observed: withReports.length,
      avgGesamt: avg,
      empCounts,
    };
  }, [filtered]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Lade Dashboard…</p>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card size="sm">
          <CardHeader className="pb-0">
            <CardDescription className="label-caps">Spieler (Filter)</CardDescription>
            <CardTitle className="text-2xl display-num">{summary.players}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-0">
            <CardDescription className="label-caps">Mit Bericht</CardDescription>
            <CardTitle className="text-2xl display-num">{summary.observed}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-0">
            <CardDescription className="label-caps">Ø Gesamt</CardDescription>
            <CardTitle className="text-2xl display-num">
              {summary.avgGesamt ?? "-"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-0">
            <CardDescription className="label-caps">Empfehlungen</CardDescription>
            <CardContent className="px-0 pt-1 flex flex-wrap gap-1">
              {EMPFEHLUNG_OPTIONS.map((e) => (
                <Badge key={e} variant="secondary" className="text-[10px]">
                  {(summary.empCounts[e] ?? 0)}× {EMPFEHLUNG_LABELS[e].split(" ")[0]}
                </Badge>
              ))}
            </CardContent>
          </CardHeader>
        </Card>
      </div>

      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle>Filter</CardTitle>
          <CardDescription>
            Am Desktop filtern und vergleichen, mobil kompakt.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Input
              type="search"
              placeholder="Name suchen…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <SimpleSelect
              value={position}
              onValueChange={setPosition}
              placeholder="Alle Positionen"
              options={positions.map((p) => ({ value: p, label: p }))}
            />
            <SimpleSelect
              value={age}
              onValueChange={(v) => setAge(v as AgeBucket | "")}
              placeholder="Alle Alter"
              options={(Object.keys(AGE_BUCKET_LABELS) as AgeBucket[]).map(
                (k) => ({ value: k, label: AGE_BUCKET_LABELS[k] })
              )}
            />
            <SimpleSelect
              value={liga}
              onValueChange={setLiga}
              placeholder="Alle Ligen"
              options={ligen.map((l) => ({ value: l, label: l }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              Min. Gesamt
              <SimpleSelect
                className="w-auto min-w-[5.5rem]"
                size="sm"
                value={String(minGesamt)}
                onValueChange={(v) => setMinGesamt(Number(v))}
                options={[
                  { value: "0", label: "-" },
                  ...[6, 7, 8, 9].map((n) => ({
                    value: String(n),
                    label: `≥ ${n}`,
                  })),
                ]}
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={empfehlung === "" ? "default" : "outline"}
                onClick={() => setEmpfehlung("")}
              >
                Alle Empf.
              </Button>
              {EMPFEHLUNG_OPTIONS.map((e) => (
                <Button
                  key={e}
                  type="button"
                  size="sm"
                  variant={empfehlung === e ? "default" : "outline"}
                  onClick={() => setEmpfehlung(e)}
                >
                  {EMPFEHLUNG_LABELS[e]}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant={onlyWithReports ? "default" : "outline"}
              onClick={() => setOnlyWithReports((v) => !v)}
            >
              Nur mit Bericht
            </Button>
          </div>
        </CardContent>
      </Card>

      {compareIds.length > 0 && (
        <div className="sticky top-16 z-10 panel-glass px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            Vergleich: {compareIds.length}/2 Spieler gewählt
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCompareIds([])}
            >
              Auswahl leeren
            </Button>
            {compareIds.length === 2 ? (
              <Button
                type="button"
                size="sm"
                render={
                  <a
                    href={`/dashboard/compare?a=${compareIds[0]}&b=${compareIds[1]}`}
                  />
                }
              >
                Vergleichen
              </Button>
            ) : (
              <Button type="button" size="sm" disabled>
                Vergleichen
              </Button>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keine Spieler für diese Filter. Importiere Kader oder lege Berichte an.
        </p>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {filtered.map((row) => (
              <li
                key={row.player.id}
                className="panel p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {row.player.vorname} {row.player.nachname}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[row.clubName, row.player.positionen.join(", "), row.age != null ? `${row.age} J.` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-semibold tabular-nums text-primary">
                      {row.latestGesamt ?? row.avgGesamt ?? "-"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {row.reportCount} Ber.
                    </div>
                  </div>
                </div>
                {row.latestEmpfehlung && (
                  <Badge variant="secondary" className="text-[10px]">
                    {EMPFEHLUNG_LABELS[row.latestEmpfehlung]}
                  </Badge>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    render={<a href={`/dashboard/players/${row.player.id}`} />}
                  >
                    Verlauf
                  </Button>
                  <Button
                    size="sm"
                    variant={compareIds.includes(row.player.id) ? "default" : "outline"}
                    onClick={() => toggleCompare(row.player.id)}
                    disabled={
                      row.reportCount === 0 ||
                      (!compareIds.includes(row.player.id) && compareIds.length >= 2)
                    }
                  >
                    Vergleich
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block panel overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Spieler</TableHead>
                  <TableHead>Verein</TableHead>
                  <TableHead>Pos.</TableHead>
                  <TableHead>Alter</TableHead>
                  <TableHead className="text-right">Ber.</TableHead>
                  <TableHead className="text-right">Gesamt</TableHead>
                  <TableHead>Empfehlung</TableHead>
                  <TableHead className="text-right">Ø Raster</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const selected = compareIds.includes(row.player.id);
                  return (
                    <TableRow
                      key={row.player.id}
                      className={cn(selected && "bg-primary/5")}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          disabled={
                            row.reportCount === 0 ||
                            (!selected && compareIds.length >= 2)
                          }
                          onCheckedChange={() => toggleCompare(row.player.id)}
                          aria-label="Zum Vergleich wählen"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.player.vorname} {row.player.nachname}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.clubName ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.player.positionen.join(", ") || "-"}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {row.age ?? "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.reportCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-primary">
                        {row.latestGesamt ?? row.avgGesamt ?? "-"}
                      </TableCell>
                      <TableCell>
                        {row.latestEmpfehlung
                          ? EMPFEHLUNG_LABELS[row.latestEmpfehlung]
                          : "-"}
                      </TableCell>
                      <TableCell
                        className="text-right tabular-nums text-muted-foreground text-xs"
                        title={attributes.map((a) => a.name).join(" / ")}
                      >
                        {attributes
                          .map((a) =>
                            row.avgByKey[a.key] != null
                              ? row.avgByKey[a.key]
                              : "-"
                          )
                          .join(" / ")}
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          href={`/dashboard/players/${row.player.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Verlauf
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
