import { useEffect, useState } from "react";
import { db } from "../lib/local/db";
import { getMediaBlobUrl, getPlayerReport, getPlayer } from "../lib/local/repository";
import type { AttributeDefinition, Match, Player, PlayerReport } from "../lib/types";
import { EMPFEHLUNG_LABELS } from "../lib/types";
import { BezugstypBadge, SyncStatusBadge } from "./ReportBadges";
import { downloadJson } from "../lib/export/json";
import { exportPlayerReportPdf } from "../lib/export/pdf";

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
        db.attributeDefinitions.where("giltFuer").equals("player").toArray(),
      ]);
      setPlayer(p);
      setAttributes(defs);
      if (r.matchId) {
        setMatch(await db.matches.get(r.matchId));
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

  if (report === undefined) return <p className="text-slate-500 text-sm">Lade…</p>;
  if (report === null) return <p className="text-red-600 text-sm">Bericht nicht gefunden.</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {player ? `${player.vorname} ${player.nachname}` : "Unbekannter Spieler"}
        </h2>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <BezugstypBadge bezugstyp={report.bezugstyp} match={match} />
          <SyncStatusBadge status={report.syncStatus} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-slate-500">Datum</div>
          <div className="font-medium">
            {new Date(report.datum).toLocaleDateString("de-DE")}
          </div>
        </div>
        {report.positionBeobachtet && (
          <div>
            <div className="text-slate-500">Position</div>
            <div className="font-medium">{report.positionBeobachtet}</div>
          </div>
        )}
        {report.empfehlung && (
          <div>
            <div className="text-slate-500">Empfehlung</div>
            <div className="font-medium">{EMPFEHLUNG_LABELS[report.empfehlung]}</div>
          </div>
        )}
        {report.gesamtbewertung && (
          <div>
            <div className="text-slate-500">Gesamtbewertung</div>
            <div className="font-medium">{report.gesamtbewertung}/10</div>
          </div>
        )}
      </div>

      {report.ratings.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold mb-2">Bewertungsraster</h3>
          <div className="space-y-2">
            {report.ratings.map((r) => {
              const def = attributes.find((a) => a.key === r.attributeKey);
              const max = def?.skalaMax ?? 10;
              return (
                <div key={r.attributeKey}>
                  <div className="flex justify-between text-sm">
                    <span>{def?.name ?? r.attributeKey}</span>
                    <span className="font-semibold">{r.value}/{max}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600"
                      style={{ width: `${(r.value / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {report.staerken && (
        <div>
          <h3 className="font-semibold text-slate-800">Stärken</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{report.staerken}</p>
        </div>
      )}
      {report.schwaechen && (
        <div>
          <h3 className="font-semibold text-slate-800">Schwächen</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{report.schwaechen}</p>
        </div>
      )}
      {report.freitextNotizen && (
        <div>
          <h3 className="font-semibold text-slate-800">Notizen</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{report.freitextNotizen}</p>
        </div>
      )}

      {photoUrls.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-2">Fotos</h3>
          <div className="flex flex-wrap gap-2">
            {photoUrls.map((url) => (
              <img
                key={url}
                src={url}
                alt="Foto zum Bericht"
                className="w-28 h-28 object-cover rounded-lg border border-slate-200"
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={() =>
            player && exportPlayerReportPdf(report, player, attributes, match)
          }
          disabled={!player}
          className="flex-1 rounded-lg bg-slate-900 text-white py-2.5 font-medium disabled:opacity-40"
        >
          📄 PDF exportieren
        </button>
        <button
          onClick={() =>
            downloadJson(`spieler-bericht-${report.id}.json`, { report, player, match })
          }
          className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium"
        >
          {"{ }"} JSON exportieren
        </button>
      </div>
    </div>
  );
}
