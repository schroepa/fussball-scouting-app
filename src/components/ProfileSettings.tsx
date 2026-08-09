import { useEffect, useState, type FormEvent } from "react";
import { getCurrentSession } from "../lib/auth/session";
import {
  resolveAppMode,
  saveLocalProfileOverlay,
  setStoredAppMode,
} from "../lib/trainer/mode";
import type { AppMode, AppRole, Scout } from "../lib/types";
import { AGE_GROUP_OPTIONS } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function ProfileSettings() {
  const [scout, setScout] = useState<Scout | null>(null);
  const [roles, setRoles] = useState<AppRole[]>(["scout"]);
  const [primaryMode, setPrimaryMode] = useState<AppMode>("scout");
  const [trainerClubName, setTrainerClubName] = useState("");
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentSession().then((session) => {
      setScout(session.scout);
      setName(session.scout.name);
      setRoles(session.scout.roles?.length ? session.scout.roles : ["scout"]);
      setPrimaryMode(resolveAppMode(session.scout));
      setTrainerClubName(session.scout.trainerClubName ?? "");
      setAgeGroups(session.scout.trainerAgeGroups ?? []);
    });
  }, []);

  const toggleRole = (role: AppRole, on: boolean) => {
    setRoles((prev) => {
      if (on) return prev.includes(role) ? prev : [...prev, role];
      const next = prev.filter((r) => r !== role);
      return next.length ? next : prev;
    });
  };

  const toggleAge = (group: string, on: boolean) => {
    setAgeGroups((prev) =>
      on ? [...prev, group] : prev.filter((g) => g !== group)
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (roles.includes("trainer")) {
      if (!trainerClubName.trim()) {
        setError("Als Trainer bitte Verein/Team angeben.");
        return;
      }
      if (ageGroups.length === 0) {
        setError("Bitte mindestens eine Altersklasse wählen.");
        return;
      }
    }
    const mode = roles.includes(primaryMode)
      ? primaryMode
      : roles.includes("trainer")
        ? "trainer"
        : "scout";
    saveLocalProfileOverlay({
      name: name.trim() || scout?.name,
      roles,
      primaryMode: mode,
      trainerClubName: roles.includes("trainer")
        ? trainerClubName.trim()
        : undefined,
      trainerAgeGroups: roles.includes("trainer") ? ageGroups : undefined,
    });
    setStoredAppMode(mode);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  if (!scout) return null;

  return (
    <form
      id="form-profile"
      onSubmit={handleSubmit}
      className="panel p-5 md:p-6 space-y-6 max-w-xl"
    >
      <div className="space-y-1.5">
        <Label htmlFor="profile-name">Anzeigename</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Rollen (Mehrfachauswahl)</legend>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={roles.includes("scout")}
            onCheckedChange={(v) => toggleRole("scout", Boolean(v))}
          />
          Scout
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={roles.includes("trainer")}
            onCheckedChange={(v) => toggleRole("trainer", Boolean(v))}
          />
          Trainer
        </label>
      </fieldset>

      {roles.includes("trainer") ? (
        <div className="space-y-4 panel p-4">
          <div className="space-y-1.5">
            <Label htmlFor="trainer-club">Verein / Team</Label>
            <Input
              id="trainer-club"
              value={trainerClubName}
              onChange={(e) => setTrainerClubName(e.target.value)}
              placeholder="z. B. FV Musterstadt"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Betreute Altersklassen</legend>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUP_OPTIONS.map((g) => (
                <label
                  key={g}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs"
                >
                  <Checkbox
                    checked={ageGroups.includes(g)}
                    onCheckedChange={(v) => toggleAge(g, Boolean(v))}
                  />
                  {g}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}

      {roles.includes("scout") && roles.includes("trainer") ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Standardansicht</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="primaryMode"
              checked={primaryMode === "scout"}
              onChange={() => setPrimaryMode("scout")}
            />
            Scout
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="primaryMode"
              checked={primaryMode === "trainer"}
              onChange={() => setPrimaryMode("trainer")}
            />
            Trainer
          </label>
        </fieldset>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-primary" role="status">
          Profil gespeichert. Navigation wechselt mit dem Modus.
        </p>
      ) : null}

      <Button type="submit">Speichern</Button>
      <p className="text-xs text-muted-foreground">
        Keine Vereins-Verifizierung im MVP, Selbstauskunft. Details:{" "}
        <a href="/hilfe" className="underline-offset-2 hover:underline">
          Hilfe
        </a>
        .
      </p>
    </form>
  );
}
