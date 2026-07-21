import type { Bezugstyp, Berichtsart, Match, SyncStatus } from "../lib/types";
import { BERICHTSART_LABELS, BEZUGSTYP_LABELS } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function BezugstypBadge({
  bezugstyp,
  match,
}: {
  bezugstyp: Bezugstyp;
  match?: Match;
}) {
  const text =
    bezugstyp === "spiel" && match
      ? `Spiel: ${match.heimClubName} vs. ${match.gastClubName}`
      : BEZUGSTYP_LABELS[bezugstyp];

  return <Badge variant="secondary">{text}</Badge>;
}

export function BerichtsartBadge({ berichtsart }: { berichtsart: Berichtsart }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        berichtsart === "gegner_analyse"
          ? "border-rose-300/80 text-rose-800 bg-rose-50"
          : "border-sky-300/80 text-sky-800 bg-sky-50"
      )}
    >
      {BERICHTSART_LABELS[berichtsart]}
    </Badge>
  );
}

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const map: Record<SyncStatus, { label: string; className: string }> = {
    pending: {
      label: "Noch nicht synchronisiert",
      className: "border-amber-300/80 text-amber-800 bg-amber-50",
    },
    synced: {
      label: "Synchronisiert",
      className: "border-primary/30 text-foreground bg-primary/10",
    },
    error: {
      label: "Sync fehlgeschlagen – Retry oben",
      className: "border-destructive/40 text-destructive bg-destructive/10",
    },
  };
  const { label, className } = map[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
