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
      <div className="flex items-baseline justify-between">
        <label className="font-medium text-slate-800">{label}</label>
        <span className="text-lg font-bold text-emerald-600 tabular-nums">
          {value ?? "–"}
        </span>
      </div>
      {description && (
        <p className="text-xs text-slate-500 mb-1">{description}</p>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-600"
        aria-label={label}
      />
      <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
