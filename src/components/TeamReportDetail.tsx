import { useEffect, useState } from "react";
import { db } from "../lib/local/db";
import { getClub, getMediaBlobUrl, getTeamReport } from "../lib/local/repository";
import type { Club, Match, Player, TeamReport } from "../lib/types";
import { BerichtsartBadge, BezugstypBadge, SyncStatusBadge } from "./ReportBadges";
import { downloadJson } from "../lib/export/json";
import { exportTeamReportPdf } from "../lib/export/pdf";

interface Props {
  reportId: string;
}

export default function TeamReportDetail({ reportId }: Props) {
  const [report, setReport] = useState<TeamReport | null | undefined>(undefined);
  const [club, setClub] = useState<Club | undefined>();
  const [match, setMatch] = useState<Match | undefined>();
  const [keyPlayers, setKeyPlayers] = useState<Player[]>([]);
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
      if (r.matchId) {
        setMatch(await db.matches.get(r.matchId));
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

  if (report === undefined) return <p className="text-slate-500 text-sm">Lade…</p>;
  if (report === null) return <p className="text-red-600 text-sm">Bericht nicht gefunden.</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {club ? club.name : "Unbekannter Verein"}
        </h2>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <BerichtsartBadge berichtsart={report.berichtsart} />
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
        {report.formation && (
          <div>
            <div className="text-slate-500">Formation</div>
            <div className="font-medium">{report.formation}</div>
          </div>
        )}
      </div>

      {report.spielstil && (
        <div>
          <h3 className="font-semibold text-slate-800">Spielstil</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{report.spielstil}</p>
        </div>
      )}
      {report.standardsituationen && (
        <div>
          <h3 className="font-semibold text-slate-800">Standardsituationen</h3>
          <p className="text-slate-700 whitespace-pre-wrap">
            {report.standardsituationen}
          </p>
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

      {keyPlayers.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Schlüsselspieler</h3>
          <ul className="flex flex-wrap gap-2">
            {keyPlayers.map((p) => (
              <li
                key={p.id}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm"
              >
                {p.vorname} {p.nachname}
              </li>
            ))}
          </ul>
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
          onClick={() => club && exportTeamReportPdf(report, club, match)}
          disabled={!club}
          className="flex-1 rounded-lg bg-slate-900 text-white py-2.5 font-medium disabled:opacity-40"
        >
          📄 PDF exportieren
        </button>
        <button
          onClick={() =>
            downloadJson(`team-bericht-${report.id}.json`, { report, club, match, keyPlayers })
          }
          className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium"
        >
          {"{ }"} JSON exportieren
        </button>
      </div>
    </div>
  );
}
