import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ClipboardList,
  LayoutGrid,
  TrendingUp,
  Users,
  UsersRound,
  AlertTriangle,
  CircleHelp,
  Share2,
} from "lucide-react";
import { getCurrentSession } from "../lib/auth/session";
import { resolveAppMode, hasRole, getActiveTeamId } from "../lib/trainer/mode";
import {
  countPending,
  listPlayerReports,
  listPlayers,
  listTeamReports,
} from "../lib/local/repository";
import {
  listOutgoingShares,
  listSquadPlayers,
  listTeams,
} from "../lib/local/trainerRepository";
import type { AppMode, PlayerReport, Scout, Team } from "../lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HomeStats {
  mode: AppMode;
  scout: Scout;
  pendingSync: number;
  playerCount: number;
  reportCount: number;
  recentReports: PlayerReport[];
  team: Team | null;
  squadCount: number;
  consentPending: number;
  openShares: number;
}

type Metric = {
  label: string;
  value: string;
  href: string;
  warn?: boolean;
};

export default function HomeDashboard() {
  const [stats, setStats] = useState<HomeStats | null>(null);

  const reload = async () => {
    const session = await getCurrentSession();
    const mode = resolveAppMode(session.scout);
    const [players, playerReports, teamReports, pending] = await Promise.all([
      listPlayers(),
      listPlayerReports(),
      listTeamReports(),
      countPending(),
    ]);

    let team: Team | null = null;
    let squadCount = 0;
    let consentPending = 0;
    let openShares = 0;

    if (mode === "trainer" || hasRole(session.scout, "trainer")) {
      const teams = await listTeams();
      const activeId = getActiveTeamId();
      team = teams.find((t) => t.id === activeId) ?? teams[0] ?? null;
      if (team) {
        const squad = await listSquadPlayers(team.id);
        squadCount = squad.length;
        consentPending = squad.filter(
          (s) => s.membership.consentStatus === "ausstehend"
        ).length;
      }
      const shares = await listOutgoingShares();
      openShares = shares.filter(
        (s) => s.status === "pending" || s.status === "active"
      ).length;
    }

    setStats({
      mode,
      scout: session.scout,
      pendingSync: pending,
      playerCount: players.length,
      reportCount: playerReports.length + teamReports.length,
      recentReports: playerReports
        .sort((a, b) => b.datum.localeCompare(a.datum))
        .slice(0, 6),
      team,
      squadCount,
      consentPending,
      openShares,
    });
  };

  useEffect(() => {
    void reload();
    const onChange = () => void reload();
    window.addEventListener("scouting:synced", onChange);
    window.addEventListener("fusca:mode-changed", onChange);
    window.addEventListener("fusca:profile-changed", onChange);
    window.addEventListener("fusca:active-team-changed", onChange);
    return () => {
      window.removeEventListener("scouting:synced", onChange);
      window.removeEventListener("fusca:mode-changed", onChange);
      window.removeEventListener("fusca:profile-changed", onChange);
      window.removeEventListener("fusca:active-team-changed", onChange);
    };
  }, []);

  if (!stats) {
    return (
      <div id="page-home-dashboard" className="space-y-4 animate-pulse" aria-busy="true">
        <div className="h-10 w-56 rounded-lg bg-muted" />
        <div className="h-28 rounded-xl bg-muted" />
        <div className="h-40 rounded-xl bg-muted" />
      </div>
    );
  }

  const firstName = stats.scout.name.split(" ")[0] || "Hallo";
  const isTrainer = stats.mode === "trainer";

  const metrics: Metric[] = isTrainer
    ? [
        { label: "Kader", value: String(stats.squadCount), href: "/kader" },
        {
          label: "Einwilligung",
          value: String(stats.consentPending),
          href: "/kader",
          warn: stats.consentPending > 0,
        },
        { label: "Beobachtungen", value: String(stats.reportCount), href: "/reports" },
        { label: "Freigaben", value: String(stats.openShares), href: "/freigaben" },
      ]
    : [
        { label: "Spieler", value: String(stats.playerCount), href: "/players" },
        { label: "Berichte", value: String(stats.reportCount), href: "/reports" },
        {
          label: "Sync offen",
          value: String(stats.pendingSync),
          href: "#app-sidebar-footer",
        },
        { label: "Auswertung", value: "Öffnen", href: "/dashboard" },
      ];

  const primaryAction = isTrainer
    ? {
        href: "/reports/new-player",
        title: "Beobachtung erfassen",
        hint: "Neuer Eintrag mit Bewertungsraster",
        Icon: ClipboardList,
      }
    : {
        href: "/reports/new-player",
        title: "Spielerbericht",
        hint: "Beobachtung erfassen",
        Icon: Users,
      };

  const secondaryActions = isTrainer
    ? [
        { href: "/aufstellung", label: "Aufstellung", Icon: LayoutGrid },
        { href: "/entwicklung", label: "Entwicklung", Icon: TrendingUp },
        { href: "/freigaben", label: "Freigaben", Icon: Share2 },
      ]
    : [
        { href: "/dashboard", label: "Auswertung", Icon: TrendingUp },
        { href: "/reports", label: "Berichte", Icon: ClipboardList },
      ];

  return (
    <div id="page-home-dashboard" className="space-y-5 md:space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground tabular-nums">
            {isTrainer ? "Trainer" : "Scout"}
            {stats.team ? ` · ${stats.team.ageGroup}` : ""}
          </p>
          <h1 id="home-dash-title" className="text-2xl md:text-[1.75rem] font-semibold tracking-tight">
            {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isTrainer
              ? stats.team
                ? stats.team.name
                : "Kein Team – unter Kader anlegen"
              : "Beobachtungen und Auswertung"}
          </p>
        </div>
      </header>

      {stats.pendingSync > 0 ? (
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 panel px-4 py-3 border-destructive/35 bg-destructive/5"
          role="status"
          aria-live="polite"
        >
          <AlertTriangle
            className="size-5 text-destructive shrink-0"
            aria-hidden="true"
            strokeWidth={1.75}
          />
          <div className="flex-1 text-sm">
            <strong className="font-semibold tabular-nums">{stats.pendingSync}</strong>{" "}
            Änderung{stats.pendingSync === 1 ? "" : "en"} warten auf Sync.
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            render={<a href="#app-sidebar-footer" />}
          >
            Sync prüfen
          </Button>
        </div>
      ) : null}

      {/* Metrics strip – one panel, not card grid */}
      <section aria-label="Kennzahlen" className="panel overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
          {metrics.map((m) => (
            <a
              key={m.label}
              href={m.href}
              className={cn(
                "px-4 py-3.5 min-h-[4.75rem] hover:bg-muted/50 focus-ring transition-colors",
                m.warn && "bg-amber-500/8"
              )}
            >
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {m.label}
              </div>
              <div
                className={cn(
                  "mt-1.5 text-2xl font-semibold tabular-nums tracking-tight",
                  m.warn && "text-amber-800 dark:text-amber-300"
                )}
              >
                {m.value}
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Primary + secondary actions */}
      <section
        className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
        aria-label="Aktionen"
      >
        <a
          href={primaryAction.href}
          className="panel flex items-center gap-4 px-4 py-4 min-h-[5.5rem] bg-primary text-primary-foreground border-transparent hover:bg-primary/92 focus-ring transition-colors"
        >
          <primaryAction.Icon
            className="size-6 shrink-0 opacity-90"
            aria-hidden="true"
            strokeWidth={1.75}
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold tracking-tight">{primaryAction.title}</div>
            <div className="text-sm text-primary-foreground/85 mt-0.5">
              {primaryAction.hint}
            </div>
          </div>
          <ArrowUpRight className="size-5 shrink-0 opacity-80" aria-hidden="true" />
        </a>

        <div className="panel p-2 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-1">
          {secondaryActions.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-11 text-sm font-medium hover:bg-muted focus-ring transition-colors"
            >
              <a.Icon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
                strokeWidth={1.75}
              />
              <span className="flex-1">{a.label}</span>
              <ArrowUpRight
                className="size-3.5 text-muted-foreground opacity-70"
                aria-hidden="true"
              />
            </a>
          ))}
        </div>
      </section>

      {/* Dense recent list */}
      <section aria-labelledby="home-recent-title" className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <h2 id="home-recent-title" className="text-sm font-semibold tracking-tight">
            {isTrainer ? "Letzte Beobachtungen" : "Zuletzt erfasst"}
          </h2>
          <a
            href="/reports"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-ring rounded-sm"
          >
            Alle
          </a>
        </div>
        {stats.recentReports.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-10 text-center">
            Noch keine Berichte. Starte mit einem Spielerbericht.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {stats.recentReports.map((r) => (
              <li key={r.id}>
                <a
                  href={`/reports/player/${r.id}`}
                  className="grid grid-cols-[7rem_minmax(0,1fr)_auto] gap-3 items-center px-4 py-3 text-sm min-h-12 hover:bg-muted/50 focus-ring"
                >
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(r.datum).toLocaleDateString("de-DE")}
                  </span>
                  <span className="truncate">
                    {r.positionBeobachtet || "Bericht"}
                  </span>
                  <span className="tabular-nums font-medium text-muted-foreground">
                    {typeof r.gesamtbewertung === "number"
                      ? `${r.gesamtbewertung}/10`
                      : "—"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!hasRole(stats.scout, "trainer") ? (
        <a
          href="/einstellungen/profil"
          className="panel-quiet flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors focus-ring"
        >
          <UsersRound
            className="size-5 shrink-0 mt-0.5 text-primary"
            aria-hidden="true"
            strokeWidth={1.75}
          />
          <div>
            <div className="font-semibold tracking-tight text-sm">
              Trainerrolle aktivieren
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Unter Profil freischalten: Kader, Entwicklung, Aufstellung.
            </p>
          </div>
        </a>
      ) : null}

      <div className="hidden md:flex flex-wrap gap-4 text-sm px-1">
        <a
          href="/hilfe"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground focus-ring rounded-sm"
        >
          <CircleHelp className="size-4" aria-hidden="true" strokeWidth={1.75} />
          Hilfe
        </a>
        <a
          href="/einstellungen/attribute"
          className="text-muted-foreground hover:text-foreground focus-ring rounded-sm"
        >
          Bewertungsfelder
        </a>
      </div>
    </div>
  );
}
