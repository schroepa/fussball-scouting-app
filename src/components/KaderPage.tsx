import { useEffect, useMemo, useState, type FormEvent } from "react";
import DuplicateMatchPanel from "./DuplicateMatchPanel";
import TeamSwitcher from "./TeamSwitcher";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createPlayer,
  listPlayers,
} from "../lib/local/repository";
import {
  addSquadMember,
  listSquadPlayers,
  removeSquadMember,
  updateSquadMembership,
} from "../lib/local/trainerRepository";
import {
  CONSENT_STATUS_LABELS,
  type ConsentStatus,
  type Player,
  type SquadMembership,
  type Team,
} from "../lib/types";
import { getActiveTeamId } from "../lib/trainer/mode";
import { formatJahrgang, parseJahrgang } from "../lib/trainer/jahrgang";

type Row = { membership: SquadMembership; player: Player };

export default function KaderPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [filter, setFilter] = useState("");
  const [consentFilter, setConsentFilter] = useState<string>("alle");
  const [positionFilter, setPositionFilter] = useState<string>("alle");
  const [jahrgangFilter, setJahrgangFilter] = useState<string>("alle");
  const [adding, setAdding] = useState(false);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [jahrgang, setJahrgang] = useState("");
  const [position, setPosition] = useState("");
  const [existingPlayerId, setExistingPlayerId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async (activeTeam?: Team | null) => {
    const teamId = activeTeam?.id ?? getActiveTeamId();
    if (!teamId) {
      setRows([]);
      return;
    }
    const [squad, players] = await Promise.all([
      listSquadPlayers(teamId),
      listPlayers(),
    ]);
    setRows(squad);
    setAllPlayers(players);
  };

  useEffect(() => {
    const onSynced = () => void reload(team);
    window.addEventListener("scouting:synced", onSynced);
    return () => window.removeEventListener("scouting:synced", onSynced);
  }, [team]);

  const squadPlayerIds = useMemo(
    () => new Set(rows.map((r) => r.player.id)),
    [rows]
  );

  const availablePlayers = allPlayers.filter((p) => !squadPlayerIds.has(p.id));

  const filtered = rows.filter((r) => {
    if (consentFilter !== "alle" && r.membership.consentStatus !== consentFilter) {
      return false;
    }
    if (positionFilter !== "alle") {
      const positions = r.player.positionen.map((p) => p.toLowerCase());
      if (!positions.includes(positionFilter.toLowerCase())) return false;
    }
    const jg = parseJahrgang(r.player.jahrgang);
    if (jahrgangFilter !== "alle") {
      if (String(jg ?? "") !== jahrgangFilter) return false;
    }
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      r.player.vorname.toLowerCase().includes(q) ||
      r.player.nachname.toLowerCase().includes(q) ||
      String(jg ?? "").includes(q) ||
      r.player.positionen.some((p) => p.toLowerCase().includes(q))
    );
  });

  const positionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      for (const p of r.player.positionen) {
        if (p.trim()) set.add(p.trim());
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "de"));
  }, [rows]);

  const jahrgangOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const j = parseJahrgang(r.player.jahrgang);
      if (j !== undefined) set.add(String(j));
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const byJahrgang = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of filtered) {
      const key = formatJahrgang(row.player.jahrgang);
      const label = key === "-" ? "Ohne Jahrgang" : key;
      const list = map.get(label) ?? [];
      list.push(row);
      map.set(label, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const handleAddNew = async (e: FormEvent) => {
    e.preventDefault();
    const teamId = team?.id ?? getActiveTeamId();
    if (!teamId) {
      setError("Bitte zuerst ein Team anlegen.");
      return;
    }
    if (!vorname.trim() || !nachname.trim()) {
      setError("Vor- und Nachname sind Pflicht.");
      return;
    }
    setError(null);
    const parsedJahrgang = parseJahrgang(jahrgang);
    if (jahrgang.trim() && parsedJahrgang === undefined) {
      setError("Jahrgang ungültig, bitte als Jahreszahl angeben (z. B. 2012).");
      return;
    }
    const player = await createPlayer({
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      positionen: position.trim() ? [position.trim()] : [],
      jahrgang: parsedJahrgang,
    });
    await addSquadMember({ teamId, playerId: player.id });
    setVorname("");
    setNachname("");
    setJahrgang("");
    setPosition("");
    setAdding(false);
    await reload(team);
  };

  const handleAddExisting = async () => {
    const teamId = team?.id ?? getActiveTeamId();
    if (!teamId || !existingPlayerId) return;
    await addSquadMember({ teamId, playerId: existingPlayerId });
    setExistingPlayerId("");
    await reload(team);
  };

  const setConsent = async (id: string, status: ConsentStatus) => {
    await updateSquadMembership(id, { consentStatus: status });
    await reload(team);
  };

  return (
    <div id="page-kader" className="space-y-5">
      <TeamSwitcher
        onChange={(t) => {
          setTeam(t);
          void reload(t);
        }}
      />

      <DuplicateMatchPanel
        player={
          selectedPlayerId
            ? rows.find((r) => r.player.id === selectedPlayerId)?.player ?? null
            : rows[0]?.player ?? null
        }
        onLinked={() => void reload(team)}
      />

      <div className="panel p-4 md:p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 flex-1">
            <div className="space-y-1.5">
              <Label htmlFor="kader-search">Suche</Label>
              <Input
                id="kader-search"
                type="search"
                placeholder="Name, Position…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kader-consent">Einwilligung</Label>
              <SimpleSelect
                id="kader-consent"
                value={consentFilter}
                onValueChange={setConsentFilter}
                options={[
                  { value: "alle", label: "Alle" },
                  { value: "ausstehend", label: "Ausstehend" },
                  { value: "erteilt", label: "Erteilt" },
                  { value: "verweigert", label: "Verweigert" },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kader-pos-filter">Position</Label>
              <SimpleSelect
                id="kader-pos-filter"
                value={positionFilter}
                onValueChange={setPositionFilter}
                options={[
                  { value: "alle", label: "Alle Positionen" },
                  ...positionOptions.map((p) => ({ value: p, label: p })),
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kader-jg-filter">Jahrgang</Label>
              <SimpleSelect
                id="kader-jg-filter"
                value={jahrgangFilter}
                onValueChange={setJahrgangFilter}
                options={[
                  { value: "alle", label: "Alle Jahrgänge" },
                  ...jahrgangOptions.map((j) => ({ value: j, label: j })),
                ]}
              />
            </div>
          </div>
          <Button type="button" onClick={() => setAdding((v) => !v)} className="shrink-0">
            {adding ? "Abbrechen" : "+ Spieler"}
          </Button>
        </div>

        {adding ? (
          <div className="space-y-4 panel-inset p-4">
            <form id="form-kader-player" onSubmit={handleAddNew} className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="k-vorname">Vorname</Label>
                <Input
                  id="k-vorname"
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="k-nachname">Nachname</Label>
                <Input
                  id="k-nachname"
                  value={nachname}
                  onChange={(e) => setNachname(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="k-jahrgang">Jahrgang</Label>
                <Input
                  id="k-jahrgang"
                  inputMode="numeric"
                  placeholder="2012"
                  pattern="[12][0-9]{3}"
                  value={jahrgang}
                  onChange={(e) => setJahrgang(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                />
                <p className="text-[11px] text-muted-foreground">Vierstellige Jahreszahl, z.&nbsp;B. 2012</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="k-pos">Position</Label>
                <Input
                  id="k-pos"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive sm:col-span-4" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="sm:col-span-4">
                <Button type="submit">Neu anlegen &amp; zum Kader</Button>
              </div>
            </form>

            {availablePlayers.length > 0 ? (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end border-t border-border pt-4">
                <div className="flex-1 space-y-1.5">
                  <Label>Bestehenden Spieler hinzufügen</Label>
                  <SimpleSelect
                    value={existingPlayerId}
                    onValueChange={setExistingPlayerId}
                    placeholder="Spieler wählen"
                    options={availablePlayers.map((p) => ({
                      value: p.id,
                      label: `${p.nachname}, ${p.vorname}${
                        parseJahrgang(p.jahrgang)
                          ? ` (${parseJahrgang(p.jahrgang)})`
                          : ""
                      }`,
                    }))}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!existingPlayerId}
                  onClick={() => void handleAddExisting()}
                >
                  Hinzufügen
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {!team ? (
        <EmptyState
          title="Kein Team aktiv"
          description="Lege ein Team an, um den Kader zu verwalten."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "Kader ist leer" : "Keine Treffer"}
          description={
            rows.length === 0
              ? "Füge Spieler hinzu, mit Jahrgang und Einwilligungsstatus."
              : "Filter zurücksetzen oder anderen Suchbegriff verwenden."
          }
        />
      ) : (
        <div className="space-y-5">
          {byJahrgang.map(([jahrgangKey, group]) => (
            <section key={jahrgangKey} aria-labelledby={`jg-${jahrgangKey}`} className="panel overflow-hidden">
              <div className="px-4 md:px-5 py-3 border-b border-border">
                <h2
                  id={`jg-${jahrgangKey}`}
                  className="label-caps"
                >
                  Jahrgang {jahrgangKey}
                </h2>
              </div>
              <ul className="divide-y divide-border">
                {group.map(({ membership, player }) => (
                  <li
                    key={membership.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 md:px-5 py-3.5 hover:bg-muted/25 transition-colors cursor-pointer"
                    onClick={() => setSelectedPlayerId(player.id)}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {player.nachname}, {player.vorname}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {player.positionen.join(", ") || "ohne Position"}
                        {membership.jerseyNumber
                          ? ` · #${membership.jerseyNumber}`
                          : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <Badge
                        variant={
                          membership.consentStatus === "erteilt"
                            ? "default"
                            : membership.consentStatus === "verweigert"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {CONSENT_STATUS_LABELS[membership.consentStatus]}
                      </Badge>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`consent-${membership.id}`}
                          className="text-[11px] text-muted-foreground"
                        >
                          Einwilligung ändern
                        </Label>
                        <SimpleSelect
                          id={`consent-${membership.id}`}
                          value={membership.consentStatus}
                          onValueChange={(v) =>
                            void setConsent(membership.id, v as ConsentStatus)
                          }
                          className="w-[10rem]"
                          size="sm"
                          options={[
                            { value: "ausstehend", label: "Ausstehend" },
                            { value: "erteilt", label: "Erteilt" },
                            { value: "verweigert", label: "Verweigert" },
                          ]}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await removeSquadMember(membership.id);
                          await reload(team);
                        }}
                      >
                        Entfernen
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
