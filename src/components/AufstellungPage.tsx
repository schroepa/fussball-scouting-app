import {
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import TeamSwitcher from "./TeamSwitcher";
import FormationSequenceEditor from "./FormationSequenceEditor";
import GameParticipationEditor from "./GameParticipationEditor";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";
import { getActiveTeamId } from "../lib/trainer/mode";
import {
  COMMON_FORMATIONS,
  defensiveFromOffensive,
  emptyPositionsFromTemplate,
} from "../lib/trainer/formationBoard";
import { listMatches } from "../lib/local/repository";
import {
  createTacticalFormation,
  deleteTacticalFormation,
  duplicateTacticalFormation,
  listSquadPlayers,
  listTacticalFormations,
  updateTacticalFormation,
} from "../lib/local/trainerRepository";
import type {
  FormationPlayerPos,
  FormationSequenceStep,
  Match,
  MovementType,
  Player,
  TacticalFormation,
  Team,
} from "../lib/types";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type BoardMode = "offensive" | "defensive";
type BoardTool = "positions" | "draw";

export default function AufstellungPage() {
  const isMobile = useIsMobile();
  const [team, setTeam] = useState<Team | null>(null);
  const [formations, setFormations] = useState<TacticalFormation[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeId, setActiveId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [boardMode, setBoardMode] = useState<BoardMode>("offensive");
  const [boardTool, setBoardTool] = useState<BoardTool>("positions");
  const [drawTool, setDrawTool] = useState<MovementType>("pass");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [name, setName] = useState("Aufstellung");
  const [templateKey, setTemplateKey] = useState("4-3-3");
  const [saving, setSaving] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const active = formations.find((f) => f.id === activeId);

  const reload = async (t?: Team | null) => {
    const teamId = t?.id ?? getActiveTeamId() ?? undefined;
    const [list, squad, matchList] = await Promise.all([
      listTacticalFormations(teamId),
      teamId ? listSquadPlayers(teamId) : Promise.resolve([]),
      listMatches(),
    ]);
    setFormations(list);
    setPlayers(squad.map((r) => r.player));
    setMatches(matchList);
    if (activeId && list.some((f) => f.id === activeId)) return;
    setActiveId(list[0]?.id ?? "");
  };

  useEffect(() => {
    const onSynced = () => void reload(team);
    window.addEventListener("scouting:synced", onSynced);
    return () => window.removeEventListener("scouting:synced", onSynced);
  }, [team, activeId]);

  const positions: FormationPlayerPos[] = useMemo(() => {
    if (!active) return [];
    return boardMode === "offensive" ? active.positionsOff : active.positionsDef;
  }, [active, boardMode]);

  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players]
  );

  const sequences = active?.sequences?.length
    ? active.sequences
    : ([{ id: "step-1", label: "Schritt 1", movements: [] }] as FormationSequenceStep[]);

  const createNew = async () => {
    const teamId = team?.id ?? getActiveTeamId() ?? undefined;
    const formation = await createTacticalFormation({
      name: name.trim() || "Aufstellung",
      teamId,
      templateKey,
    });
    setActiveId(formation.id);
    await reload(team);
  };

  const patchPositions = async (next: FormationPlayerPos[]) => {
    if (!active) return;
    setSaving(true);
    try {
      if (boardMode === "offensive") {
        await updateTacticalFormation(active.id, {
          positionsOff: next,
          positionsDef: defensiveFromOffensive(next),
        });
      } else {
        await updateTacticalFormation(active.id, { positionsDef: next });
      }
      await reload(team);
    } finally {
      setSaving(false);
    }
  };

  const saveSequences = async (next: FormationSequenceStep[]) => {
    if (!active) return;
    setSaving(true);
    try {
      await updateTacticalFormation(active.id, { sequences: next });
      await reload(team);
    } finally {
      setSaving(false);
    }
  };

  const assignPlayer = async (playerId: string) => {
    if (selectedSlot === null || !active) return;
    const next = positions.map((p, i) =>
      i === selectedSlot ? { ...p, playerId } : p
    );
    for (let i = 0; i < next.length; i++) {
      if (i !== selectedSlot && next[i]!.playerId === playerId) {
        next[i] = { ...next[i]!, playerId: "" };
      }
    }
    await patchPositions(next);
    setSelectedSlot(null);
  };

  const applyTemplate = async () => {
    if (!active) return;
    const off = emptyPositionsFromTemplate(templateKey);
    await updateTacticalFormation(active.id, {
      templateKey,
      positionsOff: off,
      positionsDef: defensiveFromOffensive(off),
    });
    await reload(team);
  };

  const moveToken = async (index: number, x: number, y: number) => {
    const next = positions.map((p, i) =>
      i === index
        ? {
            ...p,
            x: Math.max(4, Math.min(96, x)),
            y: Math.max(4, Math.min(96, y)),
          }
        : p
    );
    await patchPositions(next);
  };

  const linkGame = async (gameId: string) => {
    if (!active) return;
    await updateTacticalFormation(active.id, {
      gameId: gameId || undefined,
    });
    await reload(team);
  };

  return (
    <div id="page-aufstellung" className="space-y-5">
      <TeamSwitcher
        onChange={(t) => {
          setTeam(t);
          void reload(t);
        }}
      />

      <div className="panel p-4 md:p-5 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="space-y-1.5 flex-1">
          <Label htmlFor="f-name">Name</Label>
          <Input
            id="f-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Startelf Heim"
          />
        </div>
        <div className="space-y-1.5 w-full sm:w-40">
          <Label>Vorlage</Label>
          <SimpleSelect
            value={templateKey}
            onValueChange={setTemplateKey}
            options={COMMON_FORMATIONS.map((f) => ({ value: f, label: f }))}
          />
        </div>
        <Button type="button" onClick={() => void createNew()}>
          Neu anlegen
        </Button>
      </div>

      {formations.length > 0 ? (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
          <SimpleSelect
            value={activeId}
            onValueChange={setActiveId}
            className="sm:max-w-sm"
            options={formations.map((f) => ({
              value: f.id,
              label: `${f.name}${f.templateKey ? ` (${f.templateKey})` : ""}`,
            }))}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void applyTemplate()}
            disabled={!active}
          >
            Vorlage anwenden
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!active}
            onClick={async () => {
              if (!active) return;
              const copy = await duplicateTacticalFormation(active.id);
              if (copy) {
                setActiveId(copy.id);
                await reload(team);
              }
            }}
          >
            Duplizieren
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!active}
            onClick={async () => {
              if (!active) return;
              await deleteTacticalFormation(active.id);
              setActiveId("");
              await reload(team);
            }}
          >
            Löschen
          </Button>
          {saving ? (
            <span className="text-xs text-muted-foreground">Speichern…</span>
          ) : null}
        </div>
      ) : null}

      {!active ? (
        <EmptyState
          title="Keine Aufstellung"
          description="Lege ein Positions-Board an. Zeichnen und Spielzuordnung folgen danach."
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Label className="text-muted-foreground shrink-0">Spiel (optional)</Label>
            <SimpleSelect
              value={active.gameId ?? ""}
              onValueChange={(v) => void linkGame(v)}
              className="sm:max-w-md"
              placeholder="Keine Zuordnung"
              options={[
                { value: "", label: "Keine Zuordnung" },
                ...matches.map((m) => ({
                  value: m.id,
                  label: `${m.heimClubName} vs ${m.gastClubName} (${new Date(m.datum).toLocaleDateString("de-DE")})`,
                })),
              ]}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <div
                  className="seg-control text-xs"
                  role="group"
                  aria-label="Offensiv oder defensiv"
                >
                  <button
                    type="button"
                    className={cn(
                      "px-3 py-1.5 min-h-8",
                      boardMode === "offensive"
                        ? "seg-control__thumb"
                        : "seg-control__item"
                    )}
                    aria-pressed={boardMode === "offensive"}
                    onClick={() => setBoardMode("offensive")}
                  >
                    Offensiv
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "px-3 py-1.5 min-h-8",
                      boardMode === "defensive"
                        ? "seg-control__thumb"
                        : "seg-control__item"
                    )}
                    aria-pressed={boardMode === "defensive"}
                    onClick={() => setBoardMode("defensive")}
                  >
                    Defensiv
                  </button>
                </div>
                <div
                  className="seg-control text-xs"
                  role="group"
                  aria-label="Werkzeug"
                >
                  <button
                    type="button"
                    className={cn(
                      "px-3 py-1.5 min-h-8",
                      boardTool === "positions"
                        ? "seg-control__thumb"
                        : "seg-control__item"
                    )}
                    aria-pressed={boardTool === "positions"}
                    onClick={() => setBoardTool("positions")}
                  >
                    Positionen
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "px-3 py-1.5 min-h-8",
                      boardTool === "draw"
                        ? "seg-control__thumb"
                        : "seg-control__item"
                    )}
                    aria-pressed={boardTool === "draw"}
                    onClick={() => setBoardTool("draw")}
                  >
                    Zeichnen
                  </button>
                </div>
              </div>

              <div className="relative max-w-lg mx-auto">
                <FormationBoard
                  positions={positions}
                  playerById={playerById}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                  onMove={moveToken}
                  tokensInteractive={boardTool === "positions"}
                />
                {boardTool === "draw" ? (
                  <FormationSequenceEditor
                    variant="canvas"
                    steps={sequences}
                    activeStepIndex={Math.min(stepIndex, sequences.length - 1)}
                    onActiveStepIndex={setStepIndex}
                    onChangeSteps={(next) => void saveSequences(next)}
                    drawEnabled={!isMobile}
                    tool={drawTool}
                    onToolChange={setDrawTool}
                  />
                ) : null}
              </div>

              {boardTool === "draw" ? (
                <FormationSequenceEditor
                  variant="controls"
                  steps={sequences}
                  activeStepIndex={Math.min(stepIndex, sequences.length - 1)}
                  onActiveStepIndex={setStepIndex}
                  onChangeSteps={(next) => void saveSequences(next)}
                  drawEnabled={!isMobile}
                  tool={drawTool}
                  onToolChange={setDrawTool}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Desktop: Token ziehen. Mobile: Slot antippen. Zeichnen unter
                  „Zeichnen“ (Pass durchgezogen, Lauf gestrichelt).
                </p>
              )}
            </div>

            <aside className="panel p-3 space-y-2" aria-label="Kader zuordnen">
              <h3 className="text-sm font-semibold">
                {selectedSlot === null
                  ? "Slot wählen"
                  : `Slot ${selectedSlot + 1} besetzen`}
              </h3>
              {selectedSlot !== null && boardTool === "positions" ? (
                <ul className="panel-inset max-h-[28rem] overflow-auto divide-y divide-border/60">
                  <li>
                    <button
                      type="button"
                      className="w-full text-left px-2.5 py-2 text-sm hover:bg-muted/50 focus-ring"
                      onClick={() => void assignPlayer("")}
                    >
                      Leer
                    </button>
                  </li>
                  {players.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full text-left px-2.5 py-2 text-sm hover:bg-muted/50 focus-ring"
                        onClick={() => void assignPlayer(p.id)}
                      >
                        {p.nachname}, {p.vorname}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {boardTool === "draw"
                    ? "Zeichnen-Modus aktiv."
                    : "Tippe einen Kreis auf dem Feld an."}
                </p>
              )}
            </aside>
          </div>

          {active.gameId ? (
            <GameParticipationEditor
              gameId={active.gameId}
              teamId={active.teamId}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function FormationBoard({
  positions,
  playerById,
  selectedSlot,
  onSelectSlot,
  onMove,
  tokensInteractive,
}: {
  positions: FormationPlayerPos[];
  playerById: Map<string, Player>;
  selectedSlot: number | null;
  onSelectSlot: (index: number) => void;
  onMove: (index: number, x: number, y: number) => void | Promise<void>;
  tokensInteractive: boolean;
}) {
  const onPointerDown = (
    e: ReactPointerEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (!tokensInteractive) return;
    onSelectSlot(index);
    const field = e.currentTarget.parentElement;
    if (!field) return;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const rect = field.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;
      target.style.left = `${x}%`;
      target.style.top = `${y}%`;
    };
    const up = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const rect = field.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;
      void onMove(index, x, y);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      id="panel-formation-board"
      className="relative aspect-[2/3] w-full panel overflow-hidden bg-[linear-gradient(180deg,oklch(0.42_0.08_145)_0%,oklch(0.36_0.07_145)_50%,oklch(0.42_0.08_145)_100%)]"
      role="application"
      aria-label="Spielfeld Aufstellung"
    >
      <div
        className="absolute inset-x-[8%] top-1/2 h-px bg-white/30"
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30"
        aria-hidden="true"
      />
      {positions.map((pos, index) => {
        const player = pos.playerId ? playerById.get(pos.playerId) : undefined;
        const label = player
          ? `${player.vorname[0] ?? ""}${player.nachname[0] ?? ""}`
          : pos.positionLabel ?? String(index + 1);
        return (
          <button
            key={`${index}-${pos.positionLabel}`}
            type="button"
            className={cn(
              "absolute z-10 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-semibold shadow-sm touch-none",
              selectedSlot === index
                ? "border-white bg-primary text-primary-foreground ring-2 ring-white/70"
                : "border-white/70 bg-card text-foreground",
              !tokensInteractive && "pointer-events-none opacity-90"
            )}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            aria-label={
              player
                ? `${player.vorname} ${player.nachname}`
                : `Leerer Slot ${pos.positionLabel ?? index + 1}`
            }
            onPointerDown={(e) => onPointerDown(e, index)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
