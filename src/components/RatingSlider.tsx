import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface RatingSliderProps {
  label: string;
  description?: string;
  value: number | undefined;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

function valueText(value: number, min: number, max: number): string {
  return `${value} von ${max}`;
}

export default function RatingSlider({
  label,
  description,
  value,
  min = 1,
  max = 10,
  onChange,
}: RatingSliderProps) {
  const current = value ?? Math.round((min + max) / 2);
  const display = value ?? current;

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, (value ?? current) + delta));
    onChange(next);
  };

  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span
          className={cn(
            "text-lg font-semibold tabular-nums min-w-[2ch] text-right",
            value != null ? "text-primary" : "text-muted-foreground"
          )}
          aria-hidden="true"
        >
          {value != null ? value : "-"}
        </span>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mb-1">{description}</p>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          onClick={() => step(-1)}
          aria-label={`${label}: verringern`}
          disabled={display <= min}
        >
          <Minus className="size-4" aria-hidden="true" />
        </Button>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={display}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary h-2 cursor-pointer min-w-0"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={display}
          aria-valuetext={valueText(display, min, max)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          onClick={() => step(1)}
          aria-label={`${label}: erhöhen`}
          disabled={display >= max}
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground px-0.5 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
