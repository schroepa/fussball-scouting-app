import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  helpSections,
  helpSectionsByGroup,
  type HelpSectionId,
} from "@/lib/help/content";
import { cn } from "@/lib/utils";
import { CircleHelp, ExternalLink, RotateCcw } from "lucide-react";

export default function HelpPage() {
  const [activeId, setActiveId] = useState<HelpSectionId>("erste-schritte");
  const groups = useMemo(() => helpSectionsByGroup(), []);
  const active = useMemo(
    () => helpSections.find((s) => s.id === activeId) ?? helpSections[0]!,
    [activeId]
  );

  const restartOnboarding = () => {
    window.dispatchEvent(new Event("fusca:onboarding-restart"));
  };

  return (
    <div id="page-help" className="app-page space-y-6 md:space-y-8">
      <section
        id="section-help-intro"
        className="panel p-5 md:p-6"
        aria-labelledby="help-intro-title"
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
          <div className="flex gap-3 min-w-0">
            <div
              className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0"
              aria-hidden="true"
            >
              <CircleHelp className="size-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="help-intro-title"
                className="text-xl font-semibold tracking-tight"
              >
                Hilfe & Tutorial
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Kurze Themen zu Erfassung, Sync, Datenschutz und Desktop.
                Die First-Run-Einführung kannst du jederzeit wiederholen.
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

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,15rem)_1fr] gap-4 md:gap-6 items-start">
        <nav
          id="nav-help-topics"
          className="lg:sticky lg:top-20 space-y-3"
          aria-label="Hilfe-Themen"
        >
          {groups.map(({ group, label, sections }) => (
            <div key={group} className="space-y-1">
              <p className="px-3 label-caps">
                {label}
              </p>
              <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 -mx-1 px-1">
                {sections.map((section) => {
                  const isActive = section.id === active.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveId(section.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "text-left rounded-2xl px-3 py-2 text-sm font-medium whitespace-nowrap lg:whitespace-normal transition-colors shrink-0 focus-ring",
                        isActive
                          ? "nav-active"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      {section.title}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <article
          id={`section-help-${active.id}`}
          className="panel p-5 md:p-6 space-y-4"
          aria-labelledby="help-article-title"
        >
          <header className="space-y-1">
            <h3
              id="help-article-title"
              className="text-lg font-semibold tracking-tight"
            >
              {active.title}
            </h3>
            <p className="text-sm text-muted-foreground">{active.summary}</p>
          </header>

          {active.faqs?.length ? (
            <div className="space-y-3">
              {active.faqs.map((item) => (
                <details
                  key={item.question}
                  className="panel-inset px-3 py-2.5 group"
                >
                  <summary className="cursor-pointer text-sm font-medium list-none flex items-start justify-between gap-2 [&::-webkit-details-marker]:hidden">
                    <span>{item.question}</span>
                    <span
                      className="text-muted-foreground text-xs shrink-0 mt-0.5 group-open:rotate-180 transition-transform"
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </summary>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed pl-0">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          ) : (
            <>
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
            </>
          )}

          {active.tip ? (
            <aside
              className="panel-inset bg-accent/40 px-3 py-2.5 text-sm"
              aria-label="Tipp"
            >
              <span className="font-medium text-accent-foreground">Tipp: </span>
              <span className="text-foreground/90">{active.tip}</span>
            </aside>
          ) : null}

          {active.links?.length ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {active.links.map((link) => (
                <Button
                  key={link.href}
                  variant="outline"
                  size="sm"
                  render={<a href={link.href} />}
                >
                  {link.label}
                  <ExternalLink data-icon="inline-end" className="opacity-70" />
                </Button>
              ))}
            </div>
          ) : null}
        </article>
      </div>

      <section
        id="section-help-shortcuts"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        aria-label="Schnellzugriff"
      >
        <a
          href="/reports/new-player"
          className="panel p-4 text-sm hover:bg-muted/25 transition-colors focus-ring"
        >
          <div className="font-semibold">Spielerbericht</div>
          <div className="text-muted-foreground mt-1">Jetzt erfassen</div>
        </a>
        <a
          href="/import"
          className="panel p-4 text-sm hover:bg-muted/25 transition-colors focus-ring"
        >
          <div className="font-semibold">Import</div>
          <div className="text-muted-foreground mt-1">Kader übernehmen</div>
        </a>
        <a
          href="/dashboard"
          className="panel p-4 text-sm hover:bg-muted/25 transition-colors focus-ring"
        >
          <div className="font-semibold">Dashboard</div>
          <div className="text-muted-foreground mt-1">Auswerten</div>
        </a>
      </section>
    </div>
  );
}
