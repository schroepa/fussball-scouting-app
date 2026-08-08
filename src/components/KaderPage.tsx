import { useEffect, useMemo, useState, type FormEvent } from "react";
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

type Row = { membership: SquadMembership; player: Player };

export default function KaderPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [filter, setFilter] = useState("");
  const [consentFilter, setConsentFilter] = useState<string>("alle");
  const [adding, setAdding] = useState(false);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [jahrgang, setJahrgang] = useState("");
  const [position, setPosition] = useState("");
  const [existingPlayerId, setExistingPlayerId] = useState("");
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
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      r.player.vorname.toLowerCase().includes(q) ||
      r.player.nachname.toLowerCase().includes(q) ||
      String(r.player.jahrgang ?? "").includes(q)
    );
  });

  const byJahrgang = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of filtered) {
      const key = row.player.jahrgang
        ? String(row.player.jahrgang)
        : "Ohne Jahrgang";
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
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
    const player = await createPlayer({
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      positionen: position.trim() ? [position.trim()] : [],
      jahrgang: jahrgang ? Number(jahrgang) : undefined,
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <Input
            type="search"
            placeholder="Kader filtern…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="sm:max-w-xs"
          />
          <SimpleSelect
            value={consentFilter}
            onValueChange={setConsentFilter}
            className="sm:max-w-[12rem]"
            options={[
              { value: "alle", label: "Alle Einwilligungen" },
              { value: "ausstehend", label: "Ausstehend" },
              { value: "erteilt", label: "Erteilt" },
              { value: "verweigert", label: "Verweigert" },
            ]}
          />
        </div>
        <Button type="button" onClick={() => setAdding((v) => !v)}>
          {adding ? "Abbrechen" : "+ Spieler"}
        </Button>
      </div>

      {adding ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
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
                value={jahrgang}
                onChange={(e) => setJahrgang(e.target.value)}
              />
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
                      p.jahrgang ? ` (${p.jahrgang})` : ""
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

      {!team ? (
        <EmptyState
          title="Kein Team aktiv"
          description="Lege ein Team an, um den Kader zu verwalten."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Kader ist leer"
          description="Füge Spieler hinzu – mit Jahrgang und Einwilligungsstatus."
        />
      ) : (
        <div className="space-y-6">
          {byJahrgang.map(([jahrgangKey, group]) => (
            <section key={jahrgangKey} aria-labelledby={`jg-${jahrgangKey}`}>
              <h2
                id={`jg-${jahrgangKey}`}
                className="text-sm font-semibold text-muted-foreground mb-2"
              >
                Jahrgang {jahrgangKey}
              </h2>
              <ul className="space-y-2">
                {group.map(({ membership, player }) => (
                  <li
                    key={membership.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-card px-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {player.nachname}, {player.vorname}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {player.positionen.join(", ") || "ohne Position"}
                        {membership.jerseyNumber
                          ? ` · #${membership.jerseyNumber}`
                          : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                      <SimpleSelect
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
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
