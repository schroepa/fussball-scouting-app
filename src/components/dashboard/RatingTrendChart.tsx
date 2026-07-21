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
import type { AttributeDefinition, PlayerReport } from "../../lib/types";
import { ratingMap } from "../../lib/dashboard/aggregates";
import { DEFAULT_PLAYER_ATTRIBUTES } from "../../lib/attributeDefinitions";

interface Props {
  reports: PlayerReport[];
  attributes?: AttributeDefinition[];
  height?: number;
}

const COLORS = [
  "var(--primary)",
  "oklch(0.55 0.15 250)",
  "oklch(0.55 0.14 40)",
  "oklch(0.5 0.12 320)",
  "oklch(0.45 0.08 200)",
  "oklch(0.5 0.1 140)",
  "oklch(0.48 0.12 20)",
  "oklch(0.52 0.09 280)",
];

export default function RatingTrendChart({
  reports,
  attributes = DEFAULT_PLAYER_ATTRIBUTES,
  height = 260,
}: Props) {
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
    for (const attr of attributes) {
      point[attr.name] = map[attr.key] ?? "";
    }
    return point;
  });

  const lines = [
    { key: "Gesamt", color: COLORS[0]! },
    ...attributes.map((attr, i) => ({
      key: attr.name,
      color: COLORS[(i + 1) % COLORS.length]!,
    })),
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
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
