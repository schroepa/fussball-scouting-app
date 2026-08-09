import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listClubs, listPlayers } from "../lib/local/repository";
import {
  confirmPlayerLink,
  listPlayerLinks,
  proposePlayerLink,
  rejectPlayerLink,
} from "../lib/local/trainerRepository";
import {
  findDuplicateCandidates,
  type MatchCandidate,
} from "../lib/trainer/matching";
import type { Player, PlayerLink } from "../lib/types";
import { PLAYER_LINK_STATUS_LABELS } from "../lib/types";

/** Prüft eigene Spieler auf Doppelgänger und zeigt Blind-Vorschläge. */
export default function DuplicateMatchPanel({
  player,
  onLinked,
}: {
  player: Player | null;
  onLinked?: () => void;
}) {
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [links, setLinks] = useState<PlayerLink[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    setLinks(await listPlayerLinks());
    if (!player) {
      setCandidates([]);
      return;
    }
    const [players, clubs] = await Promise.all([listPlayers(), listClubs()]);
    const clubMap = new Map(clubs.map((c) => [c.id, c]));
    setCandidates(findDuplicateCandidates(player, players, clubMap));
  };

  useEffect(() => {
    void reload();
  }, [player?.id]);

  const openLinks = useMemo(
    () => links.filter((l) => l.status === "vorgeschlagen"),
    [links]
  );

  if (!player && openLinks.length === 0) return null;

  return (
    <div id="section-duplicate-match" className="space-y-3">
      {candidates.length > 0 && player ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
          <p className="text-sm font-medium">Möglicher Doppelgänger gefunden</p>
          <p className="text-xs text-muted-foreground">
            Blind-Preview ohne fremde Namen, Verknüpfung statt Zusammenführen.
          </p>
          <ul className="space-y-2">
            {candidates.slice(0, 3).map((c) => (
              <li
                key={c.player.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
              >
                <div className="text-sm">
                  <span className="font-medium">Score {c.score}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · Jg. {c.preview.jahrgang ?? "-"}
                    {c.preview.clubName ? ` · ${c.preview.clubName}` : ""}
                    {c.preview.positionen.length
                      ? ` · ${c.preview.positionen.join(", ")}`
                      : ""}
                  </span>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Lokal: {c.player.nachname}, {c.player.vorname}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const clubs = await listClubs();
                    const clubMap = new Map(clubs.map((x) => [x.id, x]));
                    await proposePlayerLink({
                      myPlayer: player,
                      otherPlayer: c.player,
                      score: c.score,
                      clubNameMine: player.aktuellerClubId
                        ? clubMap.get(player.aktuellerClubId)?.name
                        : undefined,
                      clubNameOther: c.player.aktuellerClubId
                        ? clubMap.get(c.player.aktuellerClubId)?.name
                        : undefined,
                    });
                    setMessage("Verknüpfung vorgeschlagen / bestätigt (lokal).");
                    await reload();
                    onLinked?.();
                  }}
                >
                  Verknüpfen
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {openLinks.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Offene Verknüpfungen</h3>
          <ul className="space-y-2">
            {openLinks.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 panel px-3 py-2"
              >
                <div className="text-sm">
                  Score {l.matchScore} · Blind A: Jg.{" "}
                  {l.previewA.jahrgang ?? "-"} / B: Jg.{" "}
                  {l.previewB.jahrgang ?? "-"}
                  <Badge variant="secondary" className="ml-2">
                    {PLAYER_LINK_STATUS_LABELS[l.status]}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      await confirmPlayerLink(l.id);
                      await reload();
                      onLinked?.();
                    }}
                  >
                    Bestätigen
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await rejectPlayerLink(l.id);
                      await reload();
                    }}
                  >
                    Ablehnen
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {message ? (
        <p className="text-sm text-primary" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
