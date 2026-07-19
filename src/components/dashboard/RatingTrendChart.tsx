import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PlayerReport } from "../../lib/types";
import { RATING_KEYS, ratingMap } from "../../lib/dashboard/aggregates";
import { DEFAULT_PLAYER_ATTRIBUTES } from "../../lib/attributeDefinitions";

interface Props {
  reports: PlayerReport[];
  height?: number;
}

const COLORS = [
  "var(--primary)",
  "oklch(0.55 0.15 250)",
  "oklch(0.55 0.14 40)",
  "oklch(0.5 0.12 320)",
  "oklch(0.45 0.08 200)",
];

export default function RatingTrendChart({ reports, height = 260 }: Props) {
  const chronological = [...reports].sort(
    (a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime()
  );

  const data = chronological.map((r) => {
    const map = ratingMap(r);
    const point: Record<string, string | number> = {
      datum: new Date(r.datum).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      }),
      Gesamt: r.gesamtbewertung ?? "",
    };
    for (const key of RATING_KEYS) {
      const attr = DEFAULT_PLAYER_ATTRIBUTES.find((a) => a.key === key);
      point[attr?.name ?? key] = map[key] ?? "";
    }
    return point;
  });

  const lines = [
    { key: "Gesamt", color: COLORS[0]! },
    ...RATING_KEYS.map((key, i) => {
      const attr = DEFAULT_PLAYER_ATTRIBUTES.find((a) => a.key === key);
      return { key: attr?.name ?? key, color: COLORS[i + 1] ?? COLORS[0]! };
    }),
  ];

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Noch keine Daten für einen Verlauf.
      </p>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="datum" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} width={28} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={line.key === "Gesamt" ? 2.5 : 1.5}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
