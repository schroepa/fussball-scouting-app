import { useEffect, useState } from "react";
import {
  ChartColumn,
  ClipboardList,
  LayoutGrid,
  Share2,
  TrendingUp,
  Users,
  UsersRound,
  AlertTriangle,
  CircleHelp,
} from "lucide-react";
import { getCurrentSession } from "../lib/auth/session";
import { resolveAppMode, hasRole } from "../lib/trainer/mode";
import { getActiveTeamId } from "../lib/trainer/mode";
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

interface HomeStats {
  mode: AppMode;
  scout: Scout;
  pendingSync: number;
  playerCount: number;
  reportCount: number;
  recentReports: PlayerReport[];
  // trainer
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
        .slice(0, 5),
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
      <div id="page-home-dashboard" className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  const firstName = stats.scout.name.split(" ")[0] || "Hallo";
  const isTrainer = stats.mode === "trainer";

  return (
    <div id="page-home-dashboard" className="space-y-6 md:space-y-8">
      <section aria-labelledby="home-dash-title" className="space-y-1">
        <h1
          id="home-dash-title"
          className="text-2xl font-bold tracking-tight md:text-xl md:font-semibold"
        >
          {firstName}, hier dein Überblick
        </h1>
        <p className="text-sm text-muted-foreground">
          {isTrainer
            ? stats.team
              ? `${stats.team.name} · ${stats.team.ageGroup}`
              : "Trainer-Modus – lege ein Team unter Kader an."
            : "Scout-Modus – Beobachtungen und Auswertung."}
        </p>
      </section>

      {stats.pendingSync > 0 ? (
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3"
          role="status"
        >
          <AlertTriangle className="size-5 text-destructive shrink-0" aria-hidden="true" />
          <div className="flex-1 text-sm">
            <strong>{stats.pendingSync}</strong> Änderung
            {stats.pendingSync === 1 ? "" : "en"} warten auf Sync.
          </div>
          <Button type="button" size="sm" variant="outline" render={<a href="#app-sidebar-footer" />}>
            Sync prüfen
          </Button>
        </div>
      ) : null}

      {isTrainer ? (
        <TrainerDash stats={stats} />
      ) : (
        <ScoutDash stats={stats} />
      )}

      <section aria-labelledby="home-recent-title" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="home-recent-title" className="text-sm font-semibold tracking-tight">
            {isTrainer ? "Letzte Beobachtungen" : "Zuletzt erfasst"}
          </h2>
          <a
            href="/reports"
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            Alle anzeigen
          </a>
        </div>
        {stats.recentReports.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border px-4 py-6">
            Noch keine Berichte. Starte mit einem Spielerbericht.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {stats.recentReports.map((r) => (
              <li key={r.id}>
                <a
                  href={`/reports/player/${r.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50"
                >
                  <span>
                    {new Date(r.datum).toLocaleDateString("de-DE")}
                    {typeof r.gesamtbewertung === "number"
                      ? ` · ${r.gesamtbewertung}/10`
                      : ""}
                  </span>
                  <span className="text-muted-foreground truncate max-w-[40%]">
                    {r.positionBeobachtet || "Bericht"}
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
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
        >
          <UsersRound className="size-5 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
          <div>
            <div className="font-semibold tracking-tight text-sm">Trainer werden?</div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Rolle unter Profil aktivieren – Kader, Entwicklung, Aufstellung.
            </p>
          </div>
        </a>
      ) : null}

      <div className="flex flex-wrap gap-3 text-sm">
        <a
          href="/hilfe"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <CircleHelp className="size-4" aria-hidden="true" />
          Hilfe
        </a>
        <a
          href="/einstellungen/attribute"
          className="text-muted-foreground hover:text-foreground"
        >
          Bewertungsfelder
        </a>
      </div>
    </div>
  );
}

function ScoutDash({ stats }: { stats: HomeStats }) {
  return (
    <>
      <section
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        aria-label="Kennzahlen"
      >
        <StatCard label="Spieler" value={String(stats.playerCount)} href="/players" />
        <StatCard label="Berichte" value={String(stats.reportCount)} href="/reports" />
        <StatCard
          label="Offener Sync"
          value={String(stats.pendingSync)}
          href="/"
          muted={stats.pendingSync === 0}
        />
        <StatCard label="Auswertung" value="→" href="/dashboard" />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Schnellaktionen">
        <ActionCard
          href="/reports/new-player"
          title="Spielerbericht"
          description="Beobachtung erfassen"
          primary
          Icon={Users}
        />
        <ActionCard
          href="/dashboard"
          title="Dashboard"
          description="Auswerten & vergleichen"
          Icon={ChartColumn}
        />
        <ActionCard
          href="/reports"
          title="Berichte"
          description="Liste nachbereiten"
          Icon={ClipboardList}
        />
        <ActionCard
          href="/players"
          title="Spieler"
          description="Stammdaten pflegen"
          Icon={Users}
        />
      </section>
    </>
  );
}

function TrainerDash({ stats }: { stats: HomeStats }) {
  return (
    <>
      <section
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        aria-label="Kennzahlen"
      >
        <StatCard
          label="Kader"
          value={String(stats.squadCount)}
          href="/kader"
        />
        <StatCard
          label="Einwilligung offen"
          value={String(stats.consentPending)}
          href="/kader"
          warn={stats.consentPending > 0}
        />
        <StatCard
          label="Freigaben"
          value={String(stats.openShares)}
          href="/freigaben"
        />
        <StatCard
          label="Beobachtungen"
          value={String(stats.reportCount)}
          href="/reports"
        />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Schnellaktionen">
        <ActionCard
          href="/kader"
          title="Kader"
          description="Spieler & Einwilligung"
          primary
          Icon={UsersRound}
        />
        <ActionCard
          href="/reports/new-player"
          title="Beobachtung"
          description="Neuen Eintrag erfassen"
          Icon={ClipboardList}
        />
        <ActionCard
          href="/entwicklung"
          title="Entwicklung"
          description="Verlauf über die Saison"
          Icon={TrendingUp}
        />
        <ActionCard
          href="/aufstellung"
          title="Aufstellung"
          description="Taktiktafel & Spielzug"
          Icon={LayoutGrid}
        />
        <ActionCard
          href="/freigaben"
          title="Freigaben"
          description="Codes & Zugriffe"
          Icon={Share2}
        />
        <ActionCard
          href="/dashboard"
          title="Auswertung"
          description="Scout-Dashboard"
          Icon={ChartColumn}
        />
      </section>
    </>
  );
}

function StatCard({
  label,
  value,
  href,
  warn,
  muted,
}: {
  label: string;
  value: string;
  href: string;
  warn?: boolean;
  muted?: boolean;
}) {
  return (
    <a
      href={href}
      className={`rounded-xl border px-4 py-3 transition-colors hover:bg-muted/50 ${
        warn
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border bg-card"
      }`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${
          muted ? "text-muted-foreground" : ""
        }`}
      >
        {value}
      </div>
    </a>
  );
}

function ActionCard({
  href,
  title,
  description,
  Icon,
  primary,
}: {
  href: string;
  title: string;
  description: string;
  Icon: typeof Users;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={
        primary
          ? "flex items-start gap-3 rounded-xl bg-primary text-primary-foreground p-4 hover:bg-primary/90 transition-colors"
          : "flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
      }
    >
      <Icon
        className={`size-5 shrink-0 mt-0.5 ${primary ? "opacity-90" : "text-primary"}`}
        aria-hidden="true"
      />
      <div>
        <div className="font-semibold tracking-tight text-sm">{title}</div>
        <div
          className={`text-sm mt-0.5 ${
            primary ? "text-primary-foreground/80" : "text-muted-foreground"
          }`}
        >
          {description}
        </div>
      </div>
    </a>
  );
}
