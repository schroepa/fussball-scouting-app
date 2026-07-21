import { useEffect, useMemo, useState } from "react";
import {
  getPlayer,
  listAttributeDefinitions,
  listClubs,
  listPlayerReportsForPlayer,
} from "../../lib/local/repository";
import type {
  AttributeDefinition,
  Club,
  Player,
  PlayerReport,
} from "../../lib/types";
import { EMPFEHLUNG_LABELS } from "../../lib/types";
import {
  attributeKeys,
  attributeLabels,
  averageGesamt,
  averageRatings,
} from "../../lib/dashboard/aggregates";
import { BezugstypBadge, SyncStatusBadge } from "../ReportBadges";
import RatingRadarChart from "./RatingRadarChart";
import RatingTrendChart from "./RatingTrendChart";
import BackLink from "../BackLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  playerId: string;
}

export default function PlayerHistory({ playerId }: Props) {
  const [player, setPlayer] = useState<Player | null | undefined>(undefined);
  const [club, setClub] = useState<Club | undefined>();
  const [reports, setReports] = useState<PlayerReport[]>([]);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);

  useEffect(() => {
    const load = async () => {
      const p = await getPlayer(playerId);
      if (!p) {
        setPlayer(null);
        return;
      }
      setPlayer(p);
      const [reps, clubs, defs] = await Promise.all([
        listPlayerReportsForPlayer(playerId),
        listClubs(),
        listAttributeDefinitions("player"),
      ]);
      setAttributes(defs);
      setReports(
        [...reps].sort(
          (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()
        )
      );
      if (p.aktuellerClubId) {
        setClub(clubs.find((c) => c.id === p.aktuellerClubId));
      }
    };
    void load();
    window.addEventListener("scouting:synced", load);
    return () => window.removeEventListener("scouting:synced", load);
  }, [playerId]);

  const keys = useMemo(() => attributeKeys(attributes), [attributes]);
  const avgByKey = useMemo(
    () => averageRatings(reports, keys),
    [reports, keys]
  );
  const avgGesamt = useMemo(() => averageGesamt(reports), [reports]);
  const labels = useMemo(() => attributeLabels(attributes), [attributes]);

  if (player === undefined) {
    return <p className="text-sm text-muted-foreground">Lade Verlauf…</p>;
  }
  if (player === null) {
    return <p className="text-sm text-destructive">Spieler nicht gefunden.</p>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <BackLink href="/dashboard/players" label="Zurück zum Spieler-Dashboard" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
            {player.vorname} {player.nachname}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {[club?.name, player.positionen.join(", ")]
              .filter(Boolean)
              .join(" · ") || "Spieler-Verlauf"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            render={
              <a
                href={`/reports/new-player?player=${encodeURIComponent(player.id)}`}
              />
            }
          >
            Bewerten
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card size="sm">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Noch keine Berichte für diesen Spieler.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card size="sm" className="lg:col-span-5 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Durchschnitt</CardTitle>
              <CardDescription>
                Ø Gesamt {avgGesamt ?? "–"} · {reports.length} Bericht
                {reports.length === 1 ? "" : "e"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <RatingRadarChart
                labels={labels}
                series={[
                  {
                    name: "Durchschnitt",
                    color: "var(--primary)",
                    values: avgByKey,
                  },
                ]}
              />
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                {attributes.map((attr) => (
                  <div
                    key={attr.key}
                    className="flex justify-between rounded-lg bg-muted/40 px-2 py-1.5"
                  >
                    <span>{attr.name}</span>
                    <span className="font-semibold tabular-nums">
                      {avgByKey[attr.key] ?? "–"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="lg:col-span-7 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Verlauf</CardTitle>
              <CardDescription>Bewertungen über die Zeit</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <RatingTrendChart reports={reports} attributes={attributes} />
            </CardContent>
          </Card>

          <Card size="sm" className="lg:col-span-12 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Berichte</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {reports.map((r) => (
                <a
                  key={r.id}
                  href={`/reports/player/${r.id}`}
                  className="block rounded-lg border border-border px-3 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">
                      {new Date(r.datum).toLocaleDateString("de-DE")}
                      {r.gesamtbewertung != null && (
                        <span className="ml-2 text-primary tabular-nums">
                          Gesamt {r.gesamtbewertung}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <BezugstypBadge bezugstyp={r.bezugstyp} />
                      <SyncStatusBadge status={r.syncStatus} />
                      {r.empfehlung && (
                        <Badge variant="secondary">
                          {EMPFEHLUNG_LABELS[r.empfehlung]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
