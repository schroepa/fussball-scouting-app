import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Match, MatchPhase } from "@/lib/types";
import {
  COMMON_FORMATIONS,
  FORMATION_SLOT_LABELS,
  type FormationSlot,
  sortPhases,
  summarizeMatchFormations,
} from "@/lib/match/formations";
import { updateMatch } from "@/lib/local/repository";
import { Plus, Trash2 } from "lucide-react";

const SLOTS: FormationSlot[] = [
  "formationHeimOff",
  "formationHeimDef",
  "formationGastOff",
  "formationGastDef",
];

interface Props {
  match: Match;
  onSaved?: (match: Match) => void;
  /** Kompakter Modus für Formulare am Platz. */
  compact?: boolean;
}

function newPhaseId(): string {
  return crypto.randomUUID();
}

function FormationChips({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {COMMON_FORMATIONS.map((f) => {
          const active = value === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => onChange(active ? "" : f)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              )}
            >
              {f}
            </button>
          );
        })}
      </div>
      <Input
        type="text"
        className="h-8 text-sm"
        placeholder="Eigenes System…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * Basis-Formationen Heim/Gast × off/def sowie Phasen mit Systemwechseln.
 */
export default function MatchFormationsEditor({
  match,
  onSaved,
  compact = false,
}: Props) {
  const [heimOff, setHeimOff] = useState(match.formationHeimOff ?? "");
  const [heimDef, setHeimDef] = useState(match.formationHeimDef ?? "");
  const [gastOff, setGastOff] = useState(match.formationGastOff ?? "");
  const [gastDef, setGastDef] = useState(match.formationGastDef ?? "");
  const [phases, setPhases] = useState<MatchPhase[]>(() =>
    sortPhases(match.phases ?? [])
  );
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);

  useEffect(() => {
    setHeimOff(match.formationHeimOff ?? "");
    setHeimDef(match.formationHeimDef ?? "");
    setGastOff(match.formationGastOff ?? "");
    setGastDef(match.formationGastDef ?? "");
    setPhases(sortPhases(match.phases ?? []));
  }, [match.id, match.updatedAt]);

  const slotValues: Record<FormationSlot, string> = useMemo(
    () => ({
      formationHeimOff: heimOff,
      formationHeimDef: heimDef,
      formationGastOff: gastOff,
      formationGastDef: gastDef,
    }),
    [heimOff, heimDef, gastOff, gastDef]
  );

  const setSlot = (slot: FormationSlot, value: string) => {
    switch (slot) {
      case "formationHeimOff":
        setHeimOff(value);
        break;
      case "formationHeimDef":
        setHeimDef(value);
        break;
      case "formationGastOff":
        setGastOff(value);
        break;
      case "formationGastDef":
        setGastDef(value);
        break;
    }
  };

  const addPhase = () => {
    const lastMinute =
      phases.length > 0 ? phases[phases.length - 1].abMinute : 0;
    setPhases((prev) => [
      ...prev,
      {
        id: newPhaseId(),
        abMinute: Math.min(90, lastMinute + 15),
        formationHeimOff: heimOff || undefined,
        formationHeimDef: heimDef || undefined,
        formationGastOff: gastOff || undefined,
        formationGastDef: gastDef || undefined,
      },
    ]);
  };

  const updatePhase = (id: string, patch: Partial<MatchPhase>) => {
    setPhases((prev) =>
      sortPhases(prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    );
  };

  const removePhase = (id: string) => {
    setPhases((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateMatch(match.id, {
        formationHeimOff: heimOff.trim() || undefined,
        formationHeimDef: heimDef.trim() || undefined,
        formationGastOff: gastOff.trim() || undefined,
        formationGastDef: gastDef.trim() || undefined,
        phases: phases.map((p) => ({
          ...p,
          formationHeimOff: p.formationHeimOff?.trim() || undefined,
          formationHeimDef: p.formationHeimDef?.trim() || undefined,
          formationGastOff: p.formationGastOff?.trim() || undefined,
          formationGastDef: p.formationGastDef?.trim() || undefined,
          notiz: p.notiz?.trim() || undefined,
        })),
      });
      if (updated) {
        onSaved?.(updated);
        setSavedHint(true);
        window.setTimeout(() => setSavedHint(false), 2000);
        window.dispatchEvent(new Event("scouting:synced"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "space-y-4 rounded-lg border border-border bg-muted/20",
        compact ? "p-3" : "p-4 md:p-5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            Formationen & Phasen
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {summarizeMatchFormations({
              ...match,
              formationHeimOff: heimOff,
              formationHeimDef: heimDef,
              formationGastOff: gastOff,
              formationGastDef: gastDef,
              phases,
            })}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Speichern…" : "Speichern"}
        </Button>
      </div>

      {savedHint ? (
        <p className="text-xs text-primary font-medium">Gespeichert.</p>
      ) : null}

      <div
        className={cn(
          "grid gap-3",
          compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
        )}
      >
        {SLOTS.map((slot) => (
          <FormationChips
            key={slot}
            label={FORMATION_SLOT_LABELS[slot]}
            value={slotValues[slot]}
            onChange={(v) => setSlot(slot, v)}
          />
        ))}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">
            Phasen / Systemwechsel
          </Label>
          <Button type="button" variant="outline" size="xs" onClick={addPhase}>
            <Plus data-icon="inline-start" />
            Phase
          </Button>
        </div>

        {phases.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Keine Phasen. Basis-Formationen gelten für das ganze Spiel.
          </p>
        ) : (
          <ul className="space-y-3">
            {phases.map((phase) => (
              <li
                key={phase.id}
                className="rounded-lg border border-border bg-background p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">ab Min.</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    className="h-8 w-20 text-sm"
                    value={phase.abMinute}
                    onChange={(e) =>
                      updatePhase(phase.id, {
                        abMinute: Number(e.target.value) || 0,
                      })
                    }
                  />
                  <button
                    type="button"
                    className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    onClick={() => removePhase(phase.id)}
                    title="Phase entfernen"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["formationHeimOff", "Heim off"],
                      ["formationHeimDef", "Heim def"],
                      ["formationGastOff", "Gast off"],
                      ["formationGastDef", "Gast def"],
                    ] as const
                  ).map(([key, label]) => (
                    <Input
                      key={key}
                      type="text"
                      className="h-8 text-xs"
                      placeholder={label}
                      value={phase[key] ?? ""}
                      onChange={(e) =>
                        updatePhase(phase.id, { [key]: e.target.value })
                      }
                    />
                  ))}
                </div>
                <Input
                  type="text"
                  className="h-8 text-sm"
                  placeholder="Notiz (optional)"
                  value={phase.notiz ?? ""}
                  onChange={(e) =>
                    updatePhase(phase.id, { notiz: e.target.value })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
