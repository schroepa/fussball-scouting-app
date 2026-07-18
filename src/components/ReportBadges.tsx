import type { Bezugstyp, Berichtsart, Match, SyncStatus } from "../lib/types";
import { BERICHTSART_LABELS, BEZUGSTYP_LABELS } from "../lib/types";

const BEZUGSTYP_ICON: Record<Bezugstyp, string> = {
  spiel: "⚽",
  training: "🏋️",
  sonstige_beobachtung: "👁️",
};

const BERICHTSART_ICON: Record<Berichtsart, string> = {
  gegner_analyse: "🎯",
  eigenes_team: "🏠",
};

export function BezugstypBadge({
  bezugstyp,
  match,
}: {
  bezugstyp: Bezugstyp;
  match?: Match;
}) {
  const text =
    bezugstyp === "spiel" && match
      ? `${BEZUGSTYP_ICON.spiel} Spiel: ${match.heimClubName} vs. ${match.gastClubName}`
      : `${BEZUGSTYP_ICON[bezugstyp]} ${BEZUGSTYP_LABELS[bezugstyp]}`;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1">
      {text}
    </span>
  );
}

export function BerichtsartBadge({ berichtsart }: { berichtsart: Berichtsart }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 ${
        berichtsart === "gegner_analyse"
          ? "bg-rose-100 text-rose-700"
          : "bg-blue-100 text-blue-700"
      }`}
    >
      {BERICHTSART_ICON[berichtsart]} {BERICHTSART_LABELS[berichtsart]}
    </span>
  );
}

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const map: Record<SyncStatus, { label: string; className: string }> = {
    pending: { label: "Noch nicht synchronisiert", className: "bg-amber-100 text-amber-700" },
    synced: { label: "Synchronisiert", className: "bg-emerald-100 text-emerald-700" },
    error: { label: "Sync-Fehler – erneut tippen", className: "bg-red-100 text-red-700" },
  };
  const { label, className } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 ${className}`}>
      {label}
    </span>
  );
}
