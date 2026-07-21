import { useEffect, useState } from "react";
import {
  getMatch,
  getMediaBlobUrl,
  getPlayerReport,
  getPlayer,
  listAttributeDefinitions,
} from "../lib/local/repository";
import type { AttributeDefinition, Match, Player, PlayerReport } from "../lib/types";
import { EMPFEHLUNG_LABELS } from "../lib/types";
import { BezugstypBadge, SyncStatusBadge } from "./ReportBadges";
import MatchFormationsSummary from "./MatchFormationsSummary";
import MatchVideoSummary from "./MatchVideoSummary";
import { downloadJson } from "../lib/export/json";
import { exportPlayerReportPdf } from "../lib/export/pdf";
import BackLink from "./BackLink";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  reportId: string;
}

export default function PlayerReportDetail({ reportId }: Props) {
  const [report, setReport] = useState<PlayerReport | null | undefined>(undefined);
  const [player, setPlayer] = useState<Player | undefined>();
  const [match, setMatch] = useState<Match | undefined>();
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const r = await getPlayerReport(reportId);
      if (!r) {
        setReport(null);
        return;
      }
      setReport(r);
      const [p, defs] = await Promise.all([
        getPlayer(r.playerId),
        listAttributeDefinitions("player"),
      ]);
      setPlayer(p);
      setAttributes(defs);
      if (r.matchId) {
        setMatch(await getMatch(r.matchId));
      } else {
        setMatch(undefined);
      }
      const urls: string[] = [];
      for (const m of r.media) {
        if (m.localBlobKey) {
          const url = await getMediaBlobUrl(m.localBlobKey);
          if (url) urls.push(url);
        }
      }
      setPhotoUrls(urls);
    };

    load();
    window.addEventListener("scouting:synced", load);
    return () => window.removeEventListener("scouting:synced", load);
  }, [reportId]);

  if (report === undefined) {
    return <p className="text-muted-foreground text-sm">Lade…</p>;
  }
  if (report === null) {
    return <p className="text-destructive text-sm">Bericht nicht gefunden.</p>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <BackLink href="/reports" label="Zurück zu Berichten" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
            {player ? `${player.vorname} ${player.nachname}` : "Unbekannter Spieler"}
          </h2>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <BezugstypBadge bezugstyp={report.bezugstyp} match={match} />
            <SyncStatusBadge status={report.syncStatus} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            render={<a href={`/reports/player/${report.id}/edit`} />}
          >
            Bearbeiten
          </Button>
          <Button
            type="button"
            onClick={() =>
              player && exportPlayerReportPdf(report, player, attributes, match)
            }
            disabled={!player}
          >
            PDF exportieren
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              downloadJson(`spieler-bericht-${report.id}.json`, {
                report,
                player,
                match,
              })
            }
          >
            JSON exportieren
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        <div className="lg:col-span-4 space-y-4">
          <Card size="sm" className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Rahmendaten</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm pt-4">
              <div>
                <div className="text-muted-foreground">Datum</div>
                <div className="font-medium">
                  {new Date(report.datum).toLocaleDateString("de-DE")}
                </div>
              </div>
              {report.positionBeobachtet && (
                <div>
                  <div className="text-muted-foreground">Position</div>
                  <div className="font-medium">{report.positionBeobachtet}</div>
                </div>
              )}
              {report.empfehlung && (
                <div className="col-span-2">
                  <div className="text-muted-foreground">Empfehlung</div>
                  <div className="font-medium">
                    {EMPFEHLUNG_LABELS[report.empfehlung]}
                  </div>
                </div>
              )}
              {report.gesamtbewertung != null && (
                <div>
                  <div className="text-muted-foreground">Gesamt</div>
                  <div className="font-medium text-primary text-lg tabular-nums">
                    {report.gesamtbewertung}/10
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <MatchFormationsSummary match={match} />
          <MatchVideoSummary match={match} />

          {photoUrls.length > 0 && (
            <Card size="sm" className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle>Fotos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-4">
                {photoUrls.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt="Foto zum Bericht"
                    className="w-28 h-28 object-cover rounded-lg border border-border"
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-8 space-y-4">
          {report.ratings.length > 0 && (
            <Card size="sm" className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle>Bewertungsraster</CardTitle>
                <CardDescription>Am Desktop in zwei Spalten</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {report.ratings.map((r) => {
                  const def = attributes.find((a) => a.key === r.attributeKey);
                  const max = def?.skalaMax ?? 10;
                  return (
                    <div key={r.attributeKey}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{def?.name ?? r.attributeKey}</span>
                        <span className="font-semibold tabular-nums">
                          {r.value}/{max}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(r.value / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card size="sm" className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Notizen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.staerken && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Stärken</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {report.staerken}
                    </p>
                  </div>
                )}
                {report.schwaechen && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Schwächen</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {report.schwaechen}
                    </p>
                  </div>
                )}
              </div>
              {report.freitextNotizen && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Weitere Notizen</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {report.freitextNotizen}
                  </p>
                </div>
              )}
              {!report.staerken &&
                !report.schwaechen &&
                !report.freitextNotizen && (
                  <p className="text-sm text-muted-foreground">Keine Notizen.</p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
