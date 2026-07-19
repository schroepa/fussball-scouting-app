import { cn } from "@/lib/utils";

interface RatingSliderProps {
  label: string;
  description?: string;
  value: number | undefined;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
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

  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span
          className={cn(
            "text-lg font-semibold tabular-nums",
            value != null ? "text-primary" : "text-muted-foreground"
          )}
        >
          {value ?? "–"}
        </span>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mb-1">{description}</p>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-2 cursor-pointer"
        aria-label={label}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
