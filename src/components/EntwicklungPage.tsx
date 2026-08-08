import { useEffect, useState } from "react";
import TeamSwitcher from "./TeamSwitcher";
import { EmptyState } from "@/components/EmptyState";
import { SimpleSelect } from "@/components/ui/select";
import { listSquadPlayers, getPlayerDevelopment } from "../lib/local/trainerRepository";
import { getActiveTeamId } from "../lib/trainer/mode";
import type { Player, PlayerReport, Team } from "../lib/types";
import { BEZUGSTYP_LABELS } from "../lib/types";
import RatingTrendChart from "./dashboard/RatingTrendChart";

export default function EntwicklungPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [reports, setReports] = useState<PlayerReport[]>([]);

  const reloadPlayers = async (t?: Team | null, preferredId?: string) => {
    const teamId = t?.id ?? getActiveTeamId();
    if (!teamId) {
      setPlayers([]);
      setPlayerId("");
      setReports([]);
      return;
    }
    const rows = await listSquadPlayers(teamId);
    const list = rows.map((r) => r.player);
    setPlayers(list);
    const current = preferredId ?? playerId;
    const nextId =
      current && list.some((p) => p.id === current)
        ? current
        : (list[0]?.id ?? "");
    setPlayerId(nextId);
    if (nextId) {
      setReports(await getPlayerDevelopment(nextId));
    } else {
      setReports([]);
    }
  };

  useEffect(() => {
    const onSynced = () => void reloadPlayers(team);
    window.addEventListener("scouting:synced", onSynced);
    return () => window.removeEventListener("scouting:synced", onSynced);
  }, [team, playerId]);

  const selected = players.find((p) => p.id === playerId);

  return (
    <div id="page-entwicklung" className="space-y-5">
      <TeamSwitcher
        onChange={(t) => {
          setTeam(t);
          void reloadPlayers(t);
        }}
      />

      {!team || players.length === 0 ? (
        <EmptyState
          title="Keine Spieler im Kader"
          description="Füge Spieler unter Kader hinzu, um den Entwicklungsverlauf zu sehen."
          action={
            <a href="/kader" className="text-sm text-primary underline-offset-2 hover:underline">
              Zum Kader
            </a>
          }
        />
      ) : (
        <>
          <div className="max-w-sm space-y-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="dev-player">
              Spieler
            </label>
            <SimpleSelect
              id="dev-player"
              value={playerId}
              onValueChange={async (id) => {
                setPlayerId(id);
                setReports(id ? await getPlayerDevelopment(id) : []);
              }}
              options={players.map((p) => ({
                value: p.id,
                label: `${p.nachname}, ${p.vorname}${
                  p.jahrgang ? ` (${p.jahrgang})` : ""
                }`,
              }))}
            />
          </div>

          {selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {selected.vorname} {selected.nachname}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {reports.length} Beobachtung
                  {reports.length === 1 ? "" : "en"} über die Saison
                </p>
              </div>

              {reports.length >= 2 ? (
                <div className="rounded-lg border border-border bg-card p-3">
                  <RatingTrendChart reports={reports} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Mindestens zwei Beobachtungen nötig für die Trendkurve.
                </p>
              )}

              <ol className="space-y-3">
                {[...reports].reverse().map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-border bg-card px-3 py-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-medium">
                        {new Date(r.datum).toLocaleDateString("de-DE")}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {BEZUGSTYP_LABELS[r.bezugstyp]}
                        </span>
                      </div>
                      {typeof r.gesamtbewertung === "number" ? (
                        <div className="text-sm font-semibold tabular-nums">
                          {r.gesamtbewertung}/10
                        </div>
                      ) : null}
                    </div>
                    {(r.staerken || r.schwaechen || r.freitextNotizen) && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                        {[r.staerken, r.schwaechen, r.freitextNotizen]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    <a
                      href={`/reports/player/${r.id}`}
                      className="mt-2 inline-block text-xs text-primary underline-offset-2 hover:underline"
                    >
                      Bericht öffnen
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
