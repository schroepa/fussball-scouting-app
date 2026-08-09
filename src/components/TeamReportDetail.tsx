import { useEffect, useState } from "react";
import { db } from "../lib/local/db";
import {
  getClub,
  getMatch,
  getMediaBlobUrl,
  getTeamReport,
  listAttributeDefinitions,
} from "../lib/local/repository";
import type {
  AttributeDefinition,
  Club,
  Match,
  Player,
  TeamReport,
} from "../lib/types";
import { BerichtsartBadge, BezugstypBadge, SyncStatusBadge } from "./ReportBadges";
import MatchFormationsSummary from "./MatchFormationsSummary";
import MatchVideoSummary from "./MatchVideoSummary";
import { downloadJson } from "../lib/export/json";
import { exportTeamReportPdf } from "../lib/export/pdf";
import BackLink from "./BackLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  reportId: string;
}

export default function TeamReportDetail({ reportId }: Props) {
  const [report, setReport] = useState<TeamReport | null | undefined>(undefined);
  const [club, setClub] = useState<Club | undefined>();
  const [match, setMatch] = useState<Match | undefined>();
  const [keyPlayers, setKeyPlayers] = useState<Player[]>([]);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const r = await getTeamReport(reportId);
      if (!r) {
        setReport(null);
        return;
      }
      setReport(r);
      setClub(await getClub(r.clubId));
      setAttributes(await listAttributeDefinitions("team"));
      if (r.matchId) {
        setMatch(await getMatch(r.matchId));
      } else {
        setMatch(undefined);
      }
      if (r.schluesselspielerIds.length > 0) {
        const players = await db.players.bulkGet(r.schluesselspielerIds);
        setKeyPlayers(players.filter((p): p is Player => Boolean(p)));
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
            {club ? club.name : "Unbekannter Verein"}
          </h2>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <BerichtsartBadge berichtsart={report.berichtsart} />
            <BezugstypBadge bezugstyp={report.bezugstyp} match={match} />
            <SyncStatusBadge status={report.syncStatus} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            render={<a href={`/reports/team/${report.id}/edit`} />}
          >
            Bearbeiten
          </Button>
          <Button
            type="button"
            onClick={() => club && exportTeamReportPdf(report, club, match)}
            disabled={!club}
          >
            PDF exportieren
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              downloadJson(`team-bericht-${report.id}.json`, {
                report,
                club,
                match,
                keyPlayers,
              })
            }
          >
            JSON exportieren
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        <div className="lg:col-span-4 space-y-4">
          <Card size="sm">
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
              {report.formation && (
                <div>
                  <div className="text-muted-foreground">Formation (Kurz)</div>
                  <div className="font-medium">{report.formation}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <MatchFormationsSummary match={match} />
          <MatchVideoSummary match={match} />

          {keyPlayers.length > 0 && (
            <Card size="sm">
              <CardHeader className="border-b">
                <CardTitle>Schlüsselspieler</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-4">
                {keyPlayers.map((p) => (
                  <Badge key={p.id} variant="secondary">
                    {p.vorname} {p.nachname}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {photoUrls.length > 0 && (
            <Card size="sm">
              <CardHeader className="border-b">
                <CardTitle>Fotos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-4">
                {photoUrls.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt="Foto zum Bericht"
                    className="w-28 h-28 object-cover panel"
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-8 space-y-4">
          {report.ratings && report.ratings.length > 0 ? (
            <Card size="sm">
              <CardHeader className="border-b">
                <CardTitle>Bewertungsraster</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm pt-4">
                {report.ratings.map((r) => {
                  const def = attributes.find((a) => a.key === r.attributeKey);
                  return (
                    <div key={r.attributeKey}>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">
                          {def?.name ?? r.attributeKey}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {r.value}/{def?.skalaMax ?? 10}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          <Card size="sm">
            <CardHeader className="border-b">
              <CardTitle>Analyse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {report.spielstil && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Spielstil</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {report.spielstil}
                  </p>
                </div>
              )}
              {report.standardsituationen && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Standardsituationen</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {report.standardsituationen}
                  </p>
                </div>
              )}
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
              {!report.spielstil &&
                !report.standardsituationen &&
                !report.staerken &&
                !report.schwaechen && (
                  <p className="text-sm text-muted-foreground">Keine Analyse-Texte.</p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
