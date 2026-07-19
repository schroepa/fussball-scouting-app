import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

export interface RadarSeries {
  name: string;
  color: string;
  values: Record<string, number | undefined>;
}

interface Props {
  labels: { key: string; label: string }[];
  series: RadarSeries[];
  height?: number;
}

export default function RatingRadarChart({
  labels,
  series,
  height = 280,
}: Props) {
  const data = labels.map(({ key, label }) => {
    const point: Record<string, string | number> = { label };
    for (const s of series) {
      point[s.name] = s.values[key] ?? 0;
    }
    return point;
  });

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid />
          <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
          {series.map((s) => (
            <Radar
              key={s.name}
              name={s.name}
              dataKey={s.name}
              stroke={s.color}
              fill={s.color}
              fillOpacity={series.length > 1 ? 0.2 : 0.35}
            />
          ))}
          <Tooltip />
          {series.length > 1 && <Legend />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
