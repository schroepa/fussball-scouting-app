import { useState } from "react";
import type {
  ImportedClub,
  ImportedPlayer,
  ImportSearchResult,
} from "../lib/import/types";
import { persistImportResult } from "../lib/import/persist";

type Tab = "spieler" | "fussballde";

export default function ImportPanel() {
  const [tab, setTab] = useState<Tab>("spieler");
  const [query, setQuery] = useState("");
  const [fussballUrl, setFussballUrl] = useState("");
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
        setStatus("Keine Treffer. Für Amateur-/Jugendspieler bitte manuell anlegen.");
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
        `${data.clubs.length} Verein(e), ${data.matches.length} Spiel(e) gefunden. Spieler-Kader liefert fussball.de nicht – Spieler bitte suchen oder manuell anlegen.`
      );
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
          `${saved.matchesCreated} Spiele neu / ${saved.matchesUpdated} aktualisiert. ` +
          `Beim Bewerten werden Stammdaten + Scout-Noten per Sync nach Supabase geschrieben.`
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
            <strong>Spieler/Vereine suchen</strong> (TheSportsDB): bekannte Spieler
            mit Stammdaten (Geburt, Position, Foto, Verein).
          </li>
          <li>
            <strong>fussball.de-Verein</strong>: Verein + Spiele aus deutschen
            Amateur-/Jugendligen. Kader-Listen liefert die API nicht.
          </li>
          <li>
            Beim Speichern eines Scouting-Berichts bleiben API-Stammdaten + deine
            Bewertungen zusammen in der lokalen DB und werden per Sync nach
            Supabase geschrieben.
          </li>
        </ul>
      </div>

      <div className="flex gap-2">
        {(
          [
            { key: "spieler", label: "Spieler/Verein suchen" },
            { key: "fussballde", label: "fussball.de-Verein" },
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

      {tab === "spieler" ? (
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
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="fussball.de-Vereins-URL oder ID einfügen"
            value={fussballUrl}
            onChange={(e) => setFussballUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <p className="text-xs text-slate-500">
            URL von der Vereinsseite kopieren (enthält{" "}
            <code className="bg-slate-100 px-1">/-/id/…</code>). Benötigt{" "}
            <code className="bg-slate-100 px-1">API_FUSSBALL_TOKEN</code> in der{" "}
            <code className="bg-slate-100 px-1">.env</code>.
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
