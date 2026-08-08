import { useEffect, useState, type FormEvent } from "react";
import { getCurrentSession } from "../lib/auth/session";
import {
  getActiveTeamId,
  setActiveTeamId,
} from "../lib/trainer/mode";
import { createTeam, listTeams } from "../lib/local/trainerRepository";
import type { Team } from "../lib/types";
import { AGE_GROUP_OPTIONS } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";

export default function TeamSwitcher({
  onChange,
}: {
  onChange?: (team: Team | null) => void;
}) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [clubName, setClubName] = useState("");
  const [ageGroup, setAgeGroup] = useState<string>("U15");
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    await getCurrentSession();
    const list = await listTeams();
    setTeams(list);
    let id = getActiveTeamId();
    if (id && !list.some((t) => t.id === id)) id = null;
    if (!id && list[0]) id = list[0].id;
    if (id) setActiveTeamId(id);
    setActiveId(id ?? "");
    onChange?.(list.find((t) => t.id === id) ?? null);
  };

  useEffect(() => {
    void reload();
    const onTeam = () => void reload();
    window.addEventListener("fusca:active-team-changed", onTeam);
    window.addEventListener("scouting:synced", onTeam);
    return () => {
      window.removeEventListener("fusca:active-team-changed", onTeam);
      window.removeEventListener("scouting:synced", onTeam);
    };
  }, []);

  const selectTeam = (id: string) => {
    if (!id) return;
    setActiveTeamId(id);
    setActiveId(id);
    onChange?.(teams.find((t) => t.id === id) ?? null);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clubName.trim()) {
      setError("Name und Verein sind Pflicht.");
      return;
    }
    setError(null);
    const team = await createTeam({
      name: name.trim(),
      clubName: clubName.trim(),
      ageGroup,
    });
    setName("");
    setClubName("");
    setCreating(false);
    setActiveTeamId(team.id);
    await reload();
  };

  return (
    <div id="section-team-switcher" className="space-y-3">
      {teams.length > 0 ? (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Label htmlFor="team-select" className="shrink-0 text-muted-foreground">
            Team
          </Label>
          <SimpleSelect
            id="team-select"
            value={activeId}
            onValueChange={selectTeam}
            className="sm:max-w-xs"
            options={teams.map((t) => ({
              value: t.id,
              label: `${t.name} · ${t.ageGroup}`,
            }))}
            placeholder="Team wählen"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? "Abbrechen" : "+ Team"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Noch kein Team – lege dein erstes an, um den Kader zu pflegen.
        </p>
      )}

      {(creating || teams.length === 0) && (
        <form
          id="form-create-team"
          onSubmit={handleCreate}
          className="grid gap-3 sm:grid-cols-3 rounded-lg border border-border bg-card p-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Mannschaft</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. U15 I"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-club">Verein</Label>
            <Input
              id="team-club"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Vereinsname"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-age">Altersklasse</Label>
            <SimpleSelect
              id="team-age"
              value={ageGroup}
              onValueChange={setAgeGroup}
              options={AGE_GROUP_OPTIONS.map((g) => ({ value: g, label: g }))}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive sm:col-span-3" role="alert">
              {error}
            </p>
          ) : null}
          <div className="sm:col-span-3">
            <Button type="submit">Team anlegen</Button>
          </div>
        </form>
      )}
    </div>
  );
}
