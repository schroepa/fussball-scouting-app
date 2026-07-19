import { useState } from "react";
import type {
  ImportedClub,
  ImportedPlayer,
  ImportSearchResult,
} from "../lib/import/types";
import { persistImportResult } from "../lib/import/persist";

type Tab = "transfermarkt" | "scraper" | "spieler" | "fussballde";

interface ScrapedTeam {
  teamId: string;
  name: string;
  category?: string;
  season?: string;
}

type ScrapeResult = ImportSearchResult & {
  teams?: ScrapedTeam[];
  seasonUsed?: string;
  notice?: string;
  error?: string;
  via?: string;
};

export default function ImportPanel() {
  const [tab, setTab] = useState<Tab>("transfermarkt");
  const [query, setQuery] = useState("");
  const [fussballUrl, setFussballUrl] = useState("");
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [tmUrl, setTmUrl] = useState("");
  const [season, setSeason] = useState("2526");
  const [teams, setTeams] = useState<ScrapedTeam[]>([]);
  const [clubContext, setClubContext] = useState<ImportedClub | null>(null);
  const [pasteNames, setPasteNames] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportSearchResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/import/search?q=${encodeURIComponent(query.trim())}`
      );
      const data = (await res.json()) as ImportSearchResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "Suche fehlgeschlagen.");
      setResult(data);
      if (data.players.length === 0 && data.clubs.length === 0) {
        setStatus(
          "Keine Treffer. Für Amateur-/Jugendspieler bitte Scraper oder manuell nutzen."
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runFussballImport = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    setResult(null);
    try {
      const res = await fetch("/api/import/fussballde-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlOrId: fussballUrl.trim() }),
      });
      const data = (await res.json()) as ImportSearchResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "Import fehlgeschlagen.");
      setResult(data);
      setStatus(
        `${data.clubs.length} Verein(e), ${data.matches.length} Spiel(e) gefunden. Für Spieler-Kader bitte Transfermarkt oder manuelle Liste nutzen.`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runTransfermarkt = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    setResult(null);
    try {
      const res = await fetch("/api/import/transfermarkt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlOrId: tmUrl.trim() }),
      });
      const data = (await res.json()) as ScrapeResult;
      if (!res.ok) throw new Error(data.error || "Transfermarkt-Import fehlgeschlagen.");
      if (data.clubs[0]) setClubContext(data.clubs[0]);
      setResult({
        clubs: data.clubs,
        players: data.players,
        matches: data.matches,
      });
      const parts: string[] = [];
      if (data.notice) parts.push(data.notice);
      if (data.via) parts.push(`Quelle: ${data.via}`);
      setStatus(parts.join(" ") || null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runScrape = async (opts?: {
    teamId?: string;
    importAllSquads?: boolean;
  }) => {
    const url = scrapeUrl.trim();
    if (/transfermarkt\./i.test(url)) {
      setTmUrl(url);
      setTab("transfermarkt");
      setLoading(true);
      setError(null);
      setStatus(null);
      setResult(null);
      try {
        const res = await fetch("/api/import/transfermarkt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urlOrId: url }),
        });
        const data = (await res.json()) as ScrapeResult;
        if (!res.ok) throw new Error(data.error || "Transfermarkt-Import fehlgeschlagen.");
        if (data.clubs[0]) setClubContext(data.clubs[0]);
        setResult({
          clubs: data.clubs,
          players: data.players,
          matches: data.matches,
        });
        setStatus(data.notice ?? null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);
    if (!opts?.teamId) setResult(null);
    try {
      const res = await fetch("/api/import/fussballde-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlOrId: url,
          mode: opts?.teamId ? "squad" : "auto",
          teamId: opts?.teamId,
          season,
          importAllSquads: opts?.importAllSquads ?? false,
        }),
      });
      const data = (await res.json()) as ScrapeResult;
      if (!res.ok) throw new Error(data.error || "Scrape fehlgeschlagen.");

      if (data.teams?.length) setTeams(data.teams);
      if (data.clubs[0]) setClubContext(data.clubs[0]);
      setResult({
        clubs: data.clubs,
        players: data.players,
        matches: data.matches,
      });

      const parts: string[] = [];
      if (data.notice) parts.push(data.notice);
      if (data.seasonUsed) parts.push(`Saison: ${data.seasonUsed}`);
      if (data.players.length) {
        parts.push(`${data.players.length} Spieler gefunden.`);
      }
      setStatus(parts.join(" ") || null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const importPastedNames = async () => {
    if (!pasteNames.trim()) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const club =
        clubContext ??
        ({
          externalSource: "manual",
          externalRef: `paste:${Date.now()}`,
          name: "Manueller Import",
          land: "Deutschland",
        } satisfies ImportedClub);

      const players: ImportedPlayer[] = pasteNames
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, idx) => {
          let vorname = "";
          let nachname = line;
          if (line.includes(",")) {
            const [nach, ...rest] = line.split(",");
            nachname = (nach ?? "").trim();
            vorname = rest.join(",").trim();
          } else {
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
              vorname = parts.slice(0, -1).join(" ");
              nachname = parts[parts.length - 1] ?? line;
            }
          }
          return {
            externalSource: "manual",
            externalRef: `paste:${club.externalRef}:${idx}:${nachname}:${vorname}`.toLowerCase(),
            vorname: vorname || "—",
            nachname,
            positionen: [],
            clubExternalRef: club.externalRef,
            clubName: club.name,
            nationalitaet: "Deutschland",
          };
        });

      const payload: ImportSearchResult = {
        clubs: clubContext ? [clubContext] : [club],
        players,
        matches: [],
      };
      const saved = await persistImportResult(payload);
      setResult(payload);
      setStatus(
        `${saved.playersCreated} Spieler neu / ${saved.playersUpdated} aktualisiert aus Namensliste übernommen.`
      );
      setPasteNames("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const importAll = async () => {
    if (!result) return;
    setLoading(true);
    setError(null);
    try {
      const saved = await persistImportResult(result);
      setStatus(
        `Importiert: ${saved.playersCreated} Spieler neu / ${saved.playersUpdated} aktualisiert, ` +
          `${saved.clubsCreated} Vereine neu / ${saved.clubsUpdated} aktualisiert, ` +
          `${saved.matchesCreated} Spiele neu / ${saved.matchesUpdated} aktualisiert.`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const importPlayer = async (player: ImportedPlayer) => {
    setLoading(true);
    setError(null);
    try {
      const saved = await persistImportResult({
        clubs: [],
        players: [player],
        matches: [],
      });
      setStatus(
        saved.playersCreated
          ? `${player.vorname} ${player.nachname} wurde übernommen.`
          : `${player.vorname} ${player.nachname} war schon vorhanden und wurde aktualisiert.`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const importClub = async (club: ImportedClub) => {
    setLoading(true);
    setError(null);
    try {
      const saved = await persistImportResult({
        clubs: [club],
        players: [],
        matches: [],
      });
      setStatus(
        saved.clubsCreated
          ? `${club.name} wurde übernommen.`
          : `${club.name} war schon vorhanden und wurde aktualisiert.`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
        <p className="font-medium text-slate-800">So funktioniert der Import</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Transfermarkt</strong>: Jugendkader mit Namen, Position,
            Geburtsdatum (z.&nbsp;B. U17) – empfohlen.
          </li>
          <li>
            <strong>fussball.de</strong>: Mannschaften laden; Kader oft gesperrt.
            Dann Namensliste nutzen.
          </li>
          <li>
            <strong>SportDB.dev</strong>: API-Proxy auf Transfermarkt (braucht
            kostenlosen API-Key) – optional in <code className="bg-slate-100 px-1">.env</code>.
          </li>
          <li>
            <strong>Spieler suchen</strong> (TheSportsDB): bekannte Profis.
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "transfermarkt", label: "Transfermarkt" },
            { key: "scraper", label: "fussball.de" },
            { key: "spieler", label: "Spieler suchen" },
            { key: "fussballde", label: "fussball.de-API" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              setTab(opt.key);
              setResult(null);
              setError(null);
              setStatus(null);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === opt.key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {tab === "spieler" && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Name suchen, z. B. Musiala"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={loading || query.trim().length < 2}
            className="rounded-lg bg-emerald-600 text-white px-4 font-medium disabled:opacity-50"
          >
            Suchen
          </button>
        </div>
      )}

      {tab === "fussballde" && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="fussball.de-Vereins-URL oder ID einfügen"
            value={fussballUrl}
            onChange={(e) => setFussballUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <p className="text-xs text-slate-500">
            Benötigt <code className="bg-slate-100 px-1">API_FUSSBALL_TOKEN</code>{" "}
            in der <code className="bg-slate-100 px-1">.env</code>.
          </p>
          <button
            type="button"
            onClick={runFussballImport}
            disabled={loading || !fussballUrl.trim()}
            className="w-full rounded-lg bg-emerald-600 text-white py-2.5 font-medium disabled:opacity-50"
          >
            Verein von fussball.de laden
          </button>
        </div>
      )}

      {tab === "transfermarkt" && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="https://www.transfermarkt.de/…/verein/35633"
            value={tmUrl}
            onChange={(e) => setTmUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <p className="text-xs text-slate-500">
            Vereins-/Jugendseiten-URL oder ID. Beispiel BFC Dynamo U17 funktioniert
            gut für Jugendkader. Optional:{" "}
            <code className="bg-slate-100 px-1">SPORTDB_API_KEY</code> von{" "}
            <a
              href="https://sportdb.dev/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              sportdb.dev
            </a>
            .
          </p>
          <button
            type="button"
            onClick={runTransfermarkt}
            disabled={loading || !tmUrl.trim()}
            className="w-full rounded-lg bg-emerald-600 text-white py-2.5 font-medium disabled:opacity-50"
          >
            Kader von Transfermarkt laden
          </button>
        </div>
      )}

      {tab === "scraper" && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Vereins- oder Mannschafts-URL von fussball.de"
            value={scrapeUrl}
            onChange={(e) => setScrapeUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600">
              Saison{" "}
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="ml-1 rounded border border-slate-300 px-2 py-1"
              >
                <option value="2627">2026/27</option>
                <option value="2526">2025/26</option>
                <option value="2425">2024/25</option>
                <option value="2324">2023/24</option>
                <option value="2223">2022/23</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => runScrape()}
              disabled={loading || !scrapeUrl.trim()}
              className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Laden
            </button>
            <button
              type="button"
              onClick={() => runScrape({ importAllSquads: true })}
              disabled={loading || !scrapeUrl.trim()}
              className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Alle Kader laden
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Beispiel: Vereinsseite kopieren (
            <code className="bg-slate-100 px-1">/verein/…/-/id/…</code>) oder
            direkt eine Mannschaft (
            <code className="bg-slate-100 px-1">team-id/…</code>). Der Scraper
            ist bewusst langsam/höflich.
          </p>

          {teams.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-800 text-sm">
                Mannschaften ({teams.length})
              </h3>
              <ul className="space-y-1 max-h-56 overflow-auto">
                {teams.map((t) => (
                  <li
                    key={t.teamId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <span className="truncate">{t.name}</span>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => runScrape({ teamId: t.teamId })}
                      className="shrink-0 text-emerald-700 font-medium underline disabled:opacity-50"
                    >
                      Kader
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-dashed border-slate-300 p-3 space-y-2">
            <p className="text-sm font-medium text-slate-800">
              Namensliste (Fallback für Jugend)
            </p>
            <p className="text-xs text-slate-500">
              Eine Zeile pro Spieler – Format{" "}
              <code className="bg-slate-100 px-1">Nachname, Vorname</code> oder{" "}
              <code className="bg-slate-100 px-1">Vorname Nachname</code>.
              {clubContext ? ` Zugeordnet zu: ${clubContext.name}.` : ""}
            </p>
            <textarea
              value={pasteNames}
              onChange={(e) => setPasteNames(e.target.value)}
              rows={4}
              placeholder={"Müller, Max\nSchmidt, Lea"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={importPastedNames}
              disabled={loading || !pasteNames.trim()}
              className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Namensliste übernehmen
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Lade…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {status && <p className="text-sm text-emerald-700">{status}</p>}

      {result && (
        <div className="space-y-4">
          {(result.players.length > 0 ||
            result.clubs.length > 0 ||
            result.matches.length > 0) && (
            <button
              type="button"
              onClick={importAll}
              disabled={loading}
              className="w-full rounded-lg bg-slate-900 text-white py-2.5 font-medium disabled:opacity-50"
            >
              Alle Treffer übernehmen
            </button>
          )}

          {result.players.length > 0 && (
            <section>
              <h3 className="font-semibold text-slate-800 mb-2">
                Spieler ({result.players.length})
              </h3>
              <ul className="space-y-2">
                {result.players.map((p) => (
                  <li
                    key={`${p.externalSource}:${p.externalRef}`}
                    className="rounded-xl border border-slate-200 p-3 flex items-center gap-3"
                  >
                    {p.fotoUrl ? (
                      <img
                        src={p.fotoUrl}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover bg-slate-100"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {p.vorname} {p.nachname}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {[p.clubName, p.positionen.join(", "), p.geburtsdatum]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => importPlayer(p)}
                      className="text-sm text-emerald-700 font-medium underline shrink-0"
                    >
                      Übernehmen
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.clubs.length > 0 && (
            <section>
              <h3 className="font-semibold text-slate-800 mb-2">
                Vereine ({result.clubs.length})
              </h3>
              <ul className="space-y-2">
                {result.clubs.map((c) => (
                  <li
                    key={`${c.externalSource}:${c.externalRef}`}
                    className="rounded-xl border border-slate-200 p-3 flex items-center gap-3"
                  >
                    {c.logoUrl ? (
                      <img
                        src={c.logoUrl}
                        alt=""
                        className="w-10 h-10 object-contain"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {[c.liga, c.land].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => importClub(c)}
                      className="text-sm text-emerald-700 font-medium underline shrink-0"
                    >
                      Übernehmen
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.matches.length > 0 && (
            <section>
              <h3 className="font-semibold text-slate-800 mb-2">
                Spiele ({result.matches.length}) – werden mit „Alle übernehmen“
                gespeichert
              </h3>
              <ul className="space-y-1 text-sm text-slate-600 max-h-40 overflow-auto">
                {result.matches.slice(0, 15).map((m) => (
                  <li key={`${m.externalSource}:${m.externalRef}`}>
                    {new Date(m.datum).toLocaleDateString("de-DE")}:{" "}
                    {m.heimClubName} vs. {m.gastClubName}
                    {m.wettbewerb ? ` (${m.wettbewerb})` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
