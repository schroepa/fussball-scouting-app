import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type {
  FormationMovement,
  FormationSequenceStep,
  MovementType,
} from "../lib/types";
import { MOVEMENT_TYPE_LABELS } from "../lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { newId } from "../lib/local/repository";

interface Props {
  steps: FormationSequenceStep[];
  activeStepIndex: number;
  onChangeSteps: (steps: FormationSequenceStep[]) => void;
  onActiveStepIndex: (index: number) => void;
  drawEnabled: boolean;
  tool: MovementType;
  onToolChange: (tool: MovementType) => void;
  /** Nur Zeichenfläche (über dem Spielfeld) oder nur Steuerung. */
  variant?: "canvas" | "controls";
}

export default function FormationSequenceEditor({
  steps,
  activeStepIndex,
  onChangeSteps,
  onActiveStepIndex,
  drawEnabled,
  tool,
  onToolChange,
  variant = "controls",
}: Props) {
  const [drawing, setDrawing] = useState<Array<{ x: number; y: number }> | null>(
    null
  );
  const svgRef = useRef<SVGSVGElement | null>(null);
  const step = steps[activeStepIndex];

  useEffect(() => {
    if (steps.length === 0) {
      onChangeSteps([{ id: newId(), label: "Schritt 1", movements: [] }]);
      onActiveStepIndex(0);
    }
  }, [steps.length]);

  const toRel = (clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawEnabled || !step) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing([toRel(e.clientX, e.clientY)]);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    setDrawing([...drawing, toRel(e.clientX, e.clientY)]);
  };

  const onPointerUp = () => {
    if (!drawing || !step || drawing.length < 2) {
      setDrawing(null);
      return;
    }
    const movement: FormationMovement = {
      id: newId(),
      typ: tool,
      order: step.movements.length,
      points: simplify(drawing),
    };
    onChangeSteps(
      steps.map((s, i) =>
        i === activeStepIndex
          ? { ...s, movements: [...s.movements, movement] }
          : s
      )
    );
    setDrawing(null);
  };

  if (variant === "canvas") {
    return (
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full z-20 touch-none"
        aria-label="Bewegungsmuster zeichnen"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrawing(null)}
      >
        {(step?.movements ?? []).map((m) => (
          <MovementPath key={m.id} movement={m} />
        ))}
        {drawing && drawing.length > 1 ? (
          <polyline
            points={drawing.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="white"
            strokeWidth={0.8}
            strokeDasharray={tool === "lauf" ? "2 1.5" : undefined}
            opacity={0.85}
          />
        ) : null}
      </svg>
    );
  }

  return (
    <div id="panel-formation-sequences" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs"
          role="tablist"
          aria-label="Sequenz-Schritte"
        >
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === activeStepIndex}
              className={cn(
                "rounded-md px-2.5 py-1.5 font-medium min-h-8",
                i === activeStepIndex
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
              onClick={() => onActiveStepIndex(i)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const next = [
              ...steps,
              {
                id: newId(),
                label: `Schritt ${steps.length + 1}`,
                movements: [],
              },
            ];
            onChangeSteps(next);
            onActiveStepIndex(next.length - 1);
          }}
        >
          + Schritt
        </Button>
        {drawEnabled ? (
          <>
            <div
              className="inline-flex rounded-lg border border-border p-0.5 text-xs"
              role="group"
              aria-label="Zeichenwerkzeug"
            >
              {(["pass", "lauf"] as MovementType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cn(
                    "rounded-md px-2.5 py-1.5 min-h-8",
                    tool === t
                      ? "bg-foreground text-background"
                      : "text-muted-foreground"
                  )}
                  aria-pressed={tool === t}
                  onClick={() => onToolChange(t)}
                >
                  {MOVEMENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                if (!step?.movements.length) return;
                onChangeSteps(
                  steps.map((s, i) =>
                    i === activeStepIndex
                      ? { ...s, movements: s.movements.slice(0, -1) }
                      : s
                  )
                );
              }}
            >
              Rückgängig
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                onChangeSteps(
                  steps.map((s, i) =>
                    i === activeStepIndex ? { ...s, movements: [] } : s
                  )
                );
              }}
            >
              Schritt leeren
            </Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            Zeichnen am Desktop/Tablet – mobil nur betrachten
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Pass = durchgezogen mit Pfeil · Lauf = gestrichelt. Sequenzen wie Folien.
      </p>
    </div>
  );
}

function MovementPath({ movement }: { movement: FormationMovement }) {
  const pts = movement.points;
  if (pts.length < 2) return null;
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const last = pts[pts.length - 1]!;
  const prev = pts[pts.length - 2]!;
  const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
  const arrow =
    movement.typ === "pass"
      ? `M ${last.x} ${last.y} L ${last.x - 2.2 * Math.cos(angle - 0.4)} ${last.y - 2.2 * Math.sin(angle - 0.4)} M ${last.x} ${last.y} L ${last.x - 2.2 * Math.cos(angle + 0.4)} ${last.y - 2.2 * Math.sin(angle + 0.4)}`
      : "";

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="white"
        strokeWidth={0.9}
        strokeDasharray={movement.typ === "lauf" ? "2 1.5" : undefined}
        opacity={0.95}
      />
      {movement.typ === "pass" ? (
        <path d={arrow} fill="none" stroke="white" strokeWidth={0.9} />
      ) : null}
    </g>
  );
}

function simplify(points: Array<{ x: number; y: number }>) {
  if (points.length <= 8) return points;
  const step = Math.ceil(points.length / 24);
  const out = points.filter((_, i) => i % step === 0);
  const last = points[points.length - 1]!;
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}
