import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ClipboardList,
  LayoutGrid,
  TrendingUp,
  Users,
  UsersRound,
  AlertTriangle,
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
        .slice(0, 7),
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
      <div
        id="page-home-dashboard"
        className="grid gap-3 md:grid-cols-12 animate-pulse"
        aria-busy="true"
      >
        <div className="md:col-span-8 h-40 rounded-[1.25rem] bg-muted" />
        <div className="md:col-span-4 h-40 rounded-[1.25rem] bg-muted" />
        <div className="md:col-span-12 h-56 rounded-[1.25rem] bg-muted" />
      </div>
    );
  }

  const firstName = stats.scout.name.split(" ")[0] || "Hallo";
  const isTrainer = stats.mode === "trainer";

  const metrics = isTrainer
    ? [
        { label: "Kader", value: stats.squadCount, href: "/kader" },
        {
          label: "Einwilligung",
          value: stats.consentPending,
          href: "/kader",
          warn: stats.consentPending > 0,
        },
        { label: "Berichte", value: stats.reportCount, href: "/reports" },
        { label: "Freigaben", value: stats.openShares, href: "/freigaben" },
      ]
    : [
        { label: "Spieler", value: stats.playerCount, href: "/players" },
        { label: "Berichte", value: stats.reportCount, href: "/reports" },
        { label: "Sync", value: stats.pendingSync, href: "#app-sidebar-footer" },
        { label: "Auswertung", value: "→", href: "/dashboard", isLink: true },
      ];

  const sideLinks = isTrainer
    ? [
        { href: "/aufstellung", label: "Aufstellung", Icon: LayoutGrid },
        { href: "/entwicklung", label: "Entwicklung", Icon: TrendingUp },
        { href: "/freigaben", label: "Freigaben", Icon: Share2 },
      ]
    : [
        { href: "/dashboard", label: "Auswertung", Icon: TrendingUp },
        { href: "/players", label: "Spieler", Icon: Users },
        { href: "/import", label: "Import", Icon: Share2 },
      ];

  return (
    <div id="page-home-dashboard" className="grid gap-3 md:gap-4 md:grid-cols-12">
      {/* Hero / welcome – wide */}
      <section className="panel md:col-span-8 relative overflow-hidden min-h-[11rem]">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(120% 80% at 100% 0%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 55%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between gap-6 p-5 md:p-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {isTrainer ? "Trainer" : "Scout"}
              {stats.team ? ` · ${stats.team.ageGroup}` : ""}
            </p>
            <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">
              {firstName}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-[40ch]">
              {isTrainer
                ? stats.team
                  ? stats.team.name
                  : "Kein Team – unter Kader anlegen"
                : "Beobachtungen erfassen und auswerten"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/reports/new-player"
              className="inline-flex h-11 min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-ring"
            >
              {isTrainer ? (
                <ClipboardList className="size-4" aria-hidden="true" strokeWidth={1.75} />
              ) : (
                <Users className="size-4" aria-hidden="true" strokeWidth={1.75} />
              )}
              {isTrainer ? "Beobachtung" : "Spielerbericht"}
            </a>
            {isTrainer ? (
              <a
                href="/aufstellung"
                className="inline-flex h-11 min-h-11 items-center gap-2 rounded-xl border border-border bg-card/80 px-4 text-sm font-medium hover:bg-muted focus-ring"
              >
                <LayoutGrid className="size-4" aria-hidden="true" strokeWidth={1.75} />
                Aufstellung
              </a>
            ) : (
              <a
                href="/dashboard"
                className="inline-flex h-11 min-h-11 items-center gap-2 rounded-xl border border-border bg-card/80 px-4 text-sm font-medium hover:bg-muted focus-ring"
              >
                <TrendingUp className="size-4" aria-hidden="true" strokeWidth={1.75} />
                Auswertung
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Side stack – metrics + links */}
      <aside className="md:col-span-4 grid gap-3 content-start">
        {stats.pendingSync > 0 ? (
          <div
            className="panel p-4 border-destructive/40 bg-destructive/5"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle
                className="size-4 text-destructive mt-0.5 shrink-0"
                aria-hidden="true"
                strokeWidth={1.75}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  <span className="display-num">{stats.pendingSync}</span> Sync offen
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  render={<a href="#app-sidebar-footer" />}
                >
                  Prüfen
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="panel overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-y divide-border">
            {metrics.map((m) => (
              <a
                key={m.label}
                href={m.href}
                className={cn(
                  "px-3.5 py-3.5 min-h-[4.75rem] hover:bg-muted/40 focus-ring transition-colors",
                  m.warn && "bg-warning/10"
                )}
              >
                <div className="text-[11px] font-medium text-muted-foreground">
                  {m.label}
                </div>
                <div
                  className={cn(
                    "mt-1 text-2xl display-num tracking-tight",
                    m.warn && "text-warning-foreground dark:text-warning"
                  )}
                >
                  {m.value}
                </div>
              </a>
            ))}
          </div>
        </div>

        <nav className="panel p-2 space-y-0.5" aria-label="Schnellzugriff">
          {sideLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-11 text-sm font-medium hover:bg-muted focus-ring"
            >
              <l.Icon
                className="size-4 text-muted-foreground"
                aria-hidden="true"
                strokeWidth={1.75}
              />
              <span className="flex-1">{l.label}</span>
              <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </a>
          ))}
        </nav>
      </aside>

      {/* Recent table – full width */}
      <section className="panel md:col-span-12 overflow-hidden" aria-labelledby="home-recent-title">
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-b border-border">
          <h2 id="home-recent-title" className="text-sm font-semibold tracking-tight">
            {isTrainer ? "Letzte Beobachtungen" : "Zuletzt erfasst"}
          </h2>
          <a
            href="/reports"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-ring rounded-sm"
          >
            Alle anzeigen
          </a>
        </div>

        {stats.recentReports.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 py-12 text-center">
            Noch keine Berichte. Starte mit einem Spielerbericht.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground border-b border-border">
                  <th scope="col" className="px-4 md:px-5 py-2.5 font-medium">
                    Datum
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Position
                  </th>
                  <th scope="col" className="px-4 md:px-5 py-2.5 font-medium text-right">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentReports.map((r: PlayerReport) => (
                  <tr key={r.id} className="hover:bg-muted/35 transition-colors">
                    <td className="px-4 md:px-5 py-3">
                      <a
                        href={`/reports/player/${r.id}`}
                        className="block tabular-nums text-muted-foreground focus-ring rounded-sm min-h-10 leading-10"
                      >
                        {new Date(r.datum).toLocaleDateString("de-DE")}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/reports/player/${r.id}`}
                        className="block truncate max-w-[14rem] focus-ring rounded-sm min-h-10 leading-10"
                      >
                        {r.positionBeobachtet || "Bericht"}
                      </a>
                    </td>
                    <td className="px-4 md:px-5 py-3 text-right">
                      <a
                        href={`/reports/player/${r.id}`}
                        className="block display-num focus-ring rounded-sm min-h-10 leading-10"
                      >
                        {typeof r.gesamtbewertung === "number"
                          ? `${r.gesamtbewertung}/10`
                          : "—"}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!hasRole(stats.scout, "trainer") ? (
        <a
          href="/einstellungen/profil"
          className="panel md:col-span-12 flex items-start gap-3 p-5 hover:bg-muted/30 transition-colors focus-ring"
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
    </div>
  );
}
