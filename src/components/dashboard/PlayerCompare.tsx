import { useEffect, useMemo, useState } from "react";
import {
  getPlayer,
  listAttributeDefinitions,
  listClubs,
  listPlayerReportsForPlayer,
} from "../../lib/local/repository";
import type { AttributeDefinition, Player, PlayerReport } from "../../lib/types";
import { EMPFEHLUNG_LABELS } from "../../lib/types";
import {
  attributeKeys,
  attributeLabels,
  averageGesamt,
  averageRatings,
} from "../../lib/dashboard/aggregates";
import RatingRadarChart from "./RatingRadarChart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  playerAId: string;
  playerBId: string;
}

interface Side {
  player: Player;
  clubName?: string;
  reports: PlayerReport[];
  avgByKey: Record<string, number | undefined>;
  avgGesamt?: number;
}

export default function PlayerCompare({ playerAId, playerBId }: Props) {
  const [a, setA] = useState<Side | null | undefined>(undefined);
  const [b, setB] = useState<Side | null | undefined>(undefined);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);

  useEffect(() => {
    const loadSide = async (
      id: string,
      keys: string[]
    ): Promise<Side | null> => {
      const player = await getPlayer(id);
      if (!player) return null;
      const [reports, clubs] = await Promise.all([
        listPlayerReportsForPlayer(id),
        listClubs(),
      ]);
      const club = player.aktuellerClubId
        ? clubs.find((c) => c.id === player.aktuellerClubId)
        : undefined;
      return {
        player,
        clubName: club?.name,
        reports,
        avgByKey: averageRatings(reports, keys),
        avgGesamt: averageGesamt(reports),
      };
    };

    const load = async () => {
      const defs = await listAttributeDefinitions("player");
      setAttributes(defs);
      const keys = attributeKeys(defs);
      const [sideA, sideB] = await Promise.all([
        loadSide(playerAId, keys),
        loadSide(playerBId, keys),
      ]);
      setA(sideA);
      setB(sideB);
    };
    void load();
    window.addEventListener("scouting:synced", load);
    return () => window.removeEventListener("scouting:synced", load);
  }, [playerAId, playerBId]);

  const labels = attributeLabels(attributes);

  const nameA = a ? `${a.player.vorname} ${a.player.nachname}` : "Spieler A";
  const nameB = b ? `${b.player.vorname} ${b.player.nachname}` : "Spieler B";

  if (a === undefined || b === undefined) {
    return <p className="text-sm text-muted-foreground">Lade Vergleich…</p>;
  }
  if (!a || !b) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          Mindestens ein Spieler wurde nicht gefunden.
        </p>
        <Button render={<a href="/dashboard/players" />}>Zum Dashboard</Button>
      </div>
    );
  }
  if (playerAId === playerBId) {
    return (
      <p className="text-sm text-destructive">
        Bitte zwei unterschiedliche Spieler wählen.
      </p>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
            Vergleich
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {nameA} vs. {nameB}, Mittelwerte aller Berichte
          </p>
        </div>
        <Button variant="outline" render={<a href="/dashboard/players" />}>
          Zurück
        </Button>
      </div>

      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle>Radar</CardTitle>
          <CardDescription>
            {attributes.map((x) => x.name).join(" · ") || "Bewertungsraster"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {a.reports.length === 0 && b.reports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Beide Spieler haben noch keine Berichte.
            </p>
          ) : (
            <RatingRadarChart
              labels={labels}
              height={320}
              series={[
                {
                  name: nameA,
                  color: "var(--primary)",
                  values: a.avgByKey,
                },
                {
                  name: nameB,
                  color: "oklch(0.55 0.14 40)",
                  values: b.avgByKey,
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SideCard side={a} title={nameA} />
        <SideCard side={b} title={nameB} />
      </div>

      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle>Direktvergleich</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <CompareRow label="Ø Gesamt" a={a.avgGesamt} b={b.avgGesamt} />
            {attributes.map((attr) => (
              <CompareRow
                key={attr.key}
                label={attr.name}
                a={a.avgByKey[attr.key]}
                b={b.avgByKey[attr.key]}
              />
            ))}
            <CompareRow
              label="Berichte"
              a={a.reports.length}
              b={b.reports.length}
              higherIsBetter
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SideCard({ side, title }: { side: Side; title: string }) {
  const latest = useMemo(
    () =>
      [...side.reports].sort(
        (x, y) => new Date(y.datum).getTime() - new Date(x.datum).getTime()
      )[0],
    [side.reports]
  );

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {[side.clubName, side.player.positionen.join(", ")]
            .filter(Boolean)
            .join(" · ") || "-"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ø Gesamt</span>
          <span className="font-semibold tabular-nums text-primary">
            {side.avgGesamt ?? "-"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Berichte</span>
          <span className="tabular-nums">{side.reports.length}</span>
        </div>
        {latest?.empfehlung && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">Empfehlung</span>
            <span className="text-right">
              {EMPFEHLUNG_LABELS[latest.empfehlung]}
            </span>
          </div>
        )}
        {latest?.staerken && (
          <div>
            <div className="text-muted-foreground mb-0.5">Stärken (letzter)</div>
            <p className="text-muted-foreground/90 whitespace-pre-wrap">
              {latest.staerken}
            </p>
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          render={<a href={`/dashboard/players/${side.player.id}`} />}
        >
          Verlauf öffnen
        </Button>
      </CardContent>
    </Card>
  );
}

function CompareRow({
  label,
  a,
  b,
  higherIsBetter = true,
}: {
  label: string;
  a: number | undefined;
  b: number | undefined;
  higherIsBetter?: boolean;
}) {
  let winner: "a" | "b" | "tie" | "none" = "none";
  if (typeof a === "number" && typeof b === "number") {
    if (a === b) winner = "tie";
    else if (higherIsBetter ? a > b : a < b) winner = "a";
    else winner = "b";
  }

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
      <span
        className={
          winner === "a"
            ? "text-right font-semibold tabular-nums text-primary"
            : "text-right tabular-nums text-muted-foreground"
        }
      >
        {a ?? "-"}
      </span>
      <span className="text-center text-xs text-muted-foreground min-w-[5rem]">
        {label}
      </span>
      <span
        className={
          winner === "b"
            ? "font-semibold tabular-nums text-primary"
            : "tabular-nums text-muted-foreground"
        }
      >
        {b ?? "-"}
      </span>
    </div>
  );
}
