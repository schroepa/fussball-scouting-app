import { useState } from "react";
import type {
  ImportedClub,
  ImportedPlayer,
  ImportSearchResult,
} from "../lib/import/types";
import { persistImportResult } from "../lib/import/persist";
import { syncAll } from "../lib/sync/syncManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { selectClassName } from "@/lib/ui";

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

/** Nach lokalem Import: wenn möglich sofort pushen, damit andere Geräte pullen können. */
async function syncAfterImport(): Promise<{
  kind: "ok" | "offline" | "failed" | "noop";
  message: string;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      kind: "offline",
      message: "Offline – Sync später über die Sync-Leiste.",
    };
  }
  try {
    const result = await syncAll();
    if (result.ok && (result.synced > 0 || result.pulled > 0)) {
      window.dispatchEvent(new Event("scouting:synced"));
    }
    if (!result.ok) {
      return { kind: "failed", message: result.message };
    }
    if (result.synced === 0 && result.pulled === 0) {
      return { kind: "noop", message: "Lokal gespeichert (bereits aktuell)." };
    }
    return {
      kind: "ok",
      message: result.message || "Mit Server synchronisiert.",
    };
  } catch (err) {
    return {
      kind: "failed",
      message:
        err instanceof Error
          ? `Sync fehlgeschlagen: ${err.message}`
          : "Sync fehlgeschlagen.",
    };
  }
}

function FeedbackBanner({
  loading,
  error,
  status,
}: {
  loading: boolean;
  error: string | null;
  status: string | null;
}) {
  if (!loading && !error && !status) return null;
  return (
    <div className="space-y-1.5" aria-live="polite">
      {loading ? (
        <p className="text-sm text-muted-foreground" aria-busy="true">
          Lade Daten…
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {status ? <p className="text-sm text-primary">{status}</p> : null}
    </div>
  );
}

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
      const sync = await syncAfterImport();
      setStatus(
        `${saved.playersCreated} Spieler neu / ${saved.playersUpdated} aktualisiert aus Namensliste. ${sync.message}`
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
      const sync = await syncAfterImport();
      setStatus(
        `Importiert: ${saved.playersCreated} Spieler neu / ${saved.playersUpdated} aktualisiert, ` +
          `${saved.clubsCreated} Vereine neu / ${saved.clubsUpdated} aktualisiert, ` +
          `${saved.matchesCreated} Spiele neu / ${saved.matchesUpdated} aktualisiert. ` +
          sync.message
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
      const sync = await syncAfterImport();
      setStatus(
        (saved.playersCreated
          ? `${player.vorname} ${player.nachname} wurde übernommen.`
          : `${player.vorname} ${player.nachname} war schon vorhanden und wurde aktualisiert.`) +
          ` ${sync.message}`
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
      const sync = await syncAfterImport();
      setStatus(
        (saved.clubsCreated
          ? `${club.name} wurde übernommen.`
          : `${club.name} war schon vorhanden und wurde aktualisiert.`) +
          ` ${sync.message}`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onTabChange = (value: string | number | null) => {
    if (typeof value !== "string") return;
    setTab(value as Tab);
    setResult(null);
    setError(null);
    setStatus(null);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="hidden md:block space-y-1">
        <p className="text-sm text-muted-foreground">
          Quelle wählen, Treffer prüfen und übernehmen – ideal am Desktop nach
          dem Spieltag.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
        <div className="xl:col-span-5 space-y-4">
          <Tabs value={tab} onValueChange={onTabChange}>
            <TabsList className="w-full flex-wrap h-auto gap-1 justify-start">
              <TabsTrigger value="transfermarkt">Transfermarkt</TabsTrigger>
              <TabsTrigger value="scraper">fussball.de</TabsTrigger>
              <TabsTrigger value="spieler">Spieler</TabsTrigger>
              <TabsTrigger value="fussballde">API</TabsTrigger>
            </TabsList>

            <TabsContent value="transfermarkt" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="tm-url">Vereins- oder Jugend-URL</Label>
                <Input
                  id="tm-url"
                  placeholder="https://www.transfermarkt.de/…/verein/35633"
                  value={tmUrl}
                  onChange={(e) => setTmUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Empfohlen für Jugendkader (Namen, Position, Geburtsdatum).
              </p>
              <Button
                type="button"
                onClick={runTransfermarkt}
                disabled={loading || !tmUrl.trim()}
                className="w-full sm:w-auto"
              >
                Kader laden
              </Button>
            </TabsContent>

            <TabsContent value="scraper" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="scrape-url">fussball.de-URL</Label>
                <Input
                  id="scrape-url"
                  placeholder="Vereins- oder Mannschafts-URL"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="season">Saison</Label>
                  <select
                    id="season"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="2627">2026/27</option>
                    <option value="2526">2025/26</option>
                    <option value="2425">2024/25</option>
                    <option value="2324">2023/24</option>
                    <option value="2223">2022/23</option>
                  </select>
                </div>
                <Button
                  type="button"
                  onClick={() => runScrape()}
                  disabled={loading || !scrapeUrl.trim()}
                >
                  Laden
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => runScrape({ importAllSquads: true })}
                  disabled={loading || !scrapeUrl.trim()}
                >
                  Alle Kader
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Jugendkader oft gesperrt – dann Namensliste nutzen.
              </p>

              {teams.length > 0 && (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-3 py-2 text-sm font-medium border-b border-border bg-muted/40">
                    Mannschaften ({teams.length})
                  </div>
                  <ul className="max-h-48 overflow-auto divide-y divide-border">
                    {teams.map((t) => (
                      <li
                        key={t.teamId}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <span className="truncate">{t.name}</span>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          disabled={loading}
                          onClick={() => runScrape({ teamId: t.teamId })}
                        >
                          Kader
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
                <p className="text-sm font-medium">Namensliste (Fallback)</p>
                <p className="text-xs text-muted-foreground">
                  Eine Zeile pro Spieler –{" "}
                  <code className="bg-muted px-1 rounded">Nachname, Vorname</code>
                  {clubContext ? ` · ${clubContext.name}` : ""}
                </p>
                <Textarea
                  value={pasteNames}
                  onChange={(e) => setPasteNames(e.target.value)}
                  rows={5}
                  placeholder={"Müller, Max\nSchmidt, Lea"}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={importPastedNames}
                  disabled={loading || !pasteNames.trim()}
                >
                  Namensliste übernehmen
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="spieler" className="mt-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="search"
                  placeholder="Name suchen, z. B. Musiala"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={runSearch}
                  disabled={loading || query.trim().length < 2}
                >
                  Suchen
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                TheSportsDB – eher bekannte Profis.
              </p>
            </TabsContent>

            <TabsContent value="fussballde" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fd-url">Vereins-URL oder ID</Label>
                <Input
                  id="fd-url"
                  placeholder="fussball.de-Vereins-URL oder ID"
                  value={fussballUrl}
                  onChange={(e) => setFussballUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Benötigt <code className="bg-muted px-1 rounded">API_FUSSBALL_TOKEN</code>{" "}
                in der .env.
              </p>
              <Button
                type="button"
                onClick={runFussballImport}
                disabled={loading || !fussballUrl.trim()}
              >
                Verein laden
              </Button>
            </TabsContent>
          </Tabs>

          <div className="hidden xl:block">
            <FeedbackBanner loading={loading} error={error} status={status} />
          </div>
        </div>

        <div className="xl:col-span-7 space-y-4 min-w-0">
          <div className="xl:hidden">
            <FeedbackBanner loading={loading} error={error} status={status} />
          </div>

          {!result ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              Treffer erscheinen hier. Am Desktop kannst du Kader in der Tabelle
              prüfen und einzeln oder komplett übernehmen.
            </div>
          ) : result.players.length === 0 &&
            result.clubs.length === 0 &&
            result.matches.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-4 py-8 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                Keine Treffer in dieser Quelle
              </p>
              <p className="text-sm text-muted-foreground">
                Tipp: Transfermarkt für Jugendkader, fussball.de + Namensliste
                als Fallback, oder den Tab „Spieler“ für bekannte Namen.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {result.players.length} Spieler · {result.clubs.length} Vereine
                  · {result.matches.length} Spiele
                </p>
                <Button
                  type="button"
                  onClick={importAll}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  Alle Treffer übernehmen
                </Button>
              </div>

              {result.players.length > 0 && (
                <section className="space-y-2">
                  <h3 className="font-semibold tracking-tight">
                    Spieler ({result.players.length})
                  </h3>

                  <ul className="space-y-2 md:hidden">
                    {result.players.map((p) => (
                      <li
                        key={`${p.externalSource}:${p.externalRef}`}
                        className="rounded-xl border border-border p-3 flex items-center gap-3"
                      >
                        {p.fotoUrl ? (
                          <img
                            src={p.fotoUrl}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover bg-muted"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-muted" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {p.vorname} {p.nachname}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[p.clubName, p.positionen.join(", "), p.geburtsdatum]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          disabled={loading}
                          onClick={() => importPlayer(p)}
                        >
                          Übernehmen
                        </Button>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden md:block rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Verein</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Geb.</TableHead>
                          <TableHead className="text-right">Aktion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.players.map((p) => (
                          <TableRow key={`${p.externalSource}:${p.externalRef}`}>
                            <TableCell className="font-medium">
                              {p.vorname} {p.nachname}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {p.clubName ?? "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {p.positionen.join(", ") || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {p.geburtsdatum ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                disabled={loading}
                                onClick={() => importPlayer(p)}
                              >
                                Übernehmen
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              )}

              {result.clubs.length > 0 && (
                <section className="space-y-2">
                  <h3 className="font-semibold tracking-tight">
                    Vereine ({result.clubs.length})
                  </h3>
                  <ul className="space-y-2">
                    {result.clubs.map((c) => (
                      <li
                        key={`${c.externalSource}:${c.externalRef}`}
                        className="rounded-xl border border-border p-3 flex items-center gap-3"
                      >
                        {c.logoUrl ? (
                          <img
                            src={c.logoUrl}
                            alt=""
                            className="w-10 h-10 object-contain"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{c.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[c.liga, c.land].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          disabled={loading}
                          onClick={() => importClub(c)}
                        >
                          Übernehmen
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.matches.length > 0 && (
                <section className="space-y-2">
                  <h3 className="font-semibold tracking-tight">
                    Spiele ({result.matches.length})
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground max-h-40 overflow-auto rounded-xl border border-border p-3">
                    {result.matches.slice(0, 20).map((m) => (
                      <li key={`${m.externalSource}:${m.externalRef}`}>
                        {new Date(m.datum).toLocaleDateString("de-DE")}:{" "}
                        {m.heimClubName} vs. {m.gastClubName}
                        {m.wettbewerb ? ` (${m.wettbewerb})` : ""}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
