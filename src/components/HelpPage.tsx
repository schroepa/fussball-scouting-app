import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { helpSections, type HelpSectionId } from "@/lib/help/content";
import { cn } from "@/lib/utils";
import { CircleHelp, RotateCcw } from "lucide-react";

export default function HelpPage() {
  const [activeId, setActiveId] = useState<HelpSectionId>("erste-schritte");
  const active = useMemo(
    () => helpSections.find((s) => s.id === activeId) ?? helpSections[0],
    [activeId]
  );

  const restartOnboarding = () => {
    window.dispatchEvent(new Event("fusca:onboarding-restart"));
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
          <div className="flex gap-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
              <CircleHelp className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Hilfe & Tutorial
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Alles Wichtige zu Erfassung, Sync, Datenschutz und Desktop.
                Die kurze Einführung kannst du jederzeit erneut starten.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 self-start"
            onClick={restartOnboarding}
          >
            <RotateCcw data-icon="inline-start" />
            Einführung starten
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 md:gap-6">
        <nav
          className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 -mx-1 px-1"
          aria-label="Hilfe-Themen"
        >
          {helpSections.map((section) => {
            const activeNav = section.id === active.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveId(section.id)}
                className={cn(
                  "text-left rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap lg:whitespace-normal transition-colors shrink-0",
                  activeNav
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border hover:bg-muted/60 text-foreground"
                )}
              >
                {section.title}
              </button>
            );
          })}
        </nav>

        <article className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">
              {active.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {active.summary}
            </p>
          </div>

          {active.paragraphs.map((p) => (
            <p
              key={p.slice(0, 48)}
              className="text-sm leading-relaxed text-foreground/90"
            >
              {p}
            </p>
          ))}

          {active.bullets?.length ? (
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground/90">
              {active.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}

          {active.id === "privacy" ? (
            <div className="rounded-lg bg-accent/50 border border-border px-4 py-3 text-sm">
              <strong className="font-medium">Kurz gesagt:</strong> Was du
              beobachtest, bleibt bei dir. Andere Scouts sehen deine Spieler und
              Teams nicht in ihrer Oberfläche.
            </div>
          ) : null}
        </article>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a
          href="/reports/new-player"
          className="rounded-xl border border-border bg-card p-4 text-sm hover:bg-muted/50 transition-colors"
        >
          <div className="font-semibold">Spielerbericht</div>
          <div className="text-muted-foreground mt-1">Jetzt erfassen</div>
        </a>
        <a
          href="/import"
          className="rounded-xl border border-border bg-card p-4 text-sm hover:bg-muted/50 transition-colors"
        >
          <div className="font-semibold">Import</div>
          <div className="text-muted-foreground mt-1">Kader übernehmen</div>
        </a>
        <a
          href="/dashboard"
          className="rounded-xl border border-border bg-card p-4 text-sm hover:bg-muted/50 transition-colors"
        >
          <div className="font-semibold">Dashboard</div>
          <div className="text-muted-foreground mt-1">Auswerten</div>
        </a>
      </section>
    </div>
  );
}
