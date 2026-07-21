import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ONBOARDING_STORAGE_KEY,
  onboardingSteps,
} from "@/lib/help/content";
import { cn } from "@/lib/utils";

function isDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markDone() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function resetOnboardingFlag() {
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * First-run Einführung. Wird nach Login einmal gezeigt; dismissbar und unter Hilfe erneut startbar.
 */
export default function OnboardingWizard({
  forceOpen = false,
}: {
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }
    if (!isDone()) setOpen(true);
  }, [forceOpen]);

  useEffect(() => {
    const reopen = () => {
      resetOnboardingFlag();
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("fusca:onboarding-restart", reopen);
    return () => window.removeEventListener("fusca:onboarding-restart", reopen);
  }, []);

  if (!open) return null;

  const current = onboardingSteps[step];
  const isLast = step === onboardingSteps.length - 1;
  const isFirst = step === 0;

  const finish = () => {
    markDone();
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full sm:max-w-lg rounded-t-xl sm:rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in">
        <div className="h-1.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${((step + 1) / onboardingSteps.length) * 100}%`,
            }}
          />
        </div>

        <div className="p-6 sm:p-8 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Einführung {step + 1} / {onboardingSteps.length}
          </p>
          <h2
            id="onboarding-title"
            className="text-xl sm:text-2xl font-semibold tracking-tight text-card-foreground"
          >
            {current.title}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {current.body}
          </p>
          {current.ctaHint ? (
            <p className="text-sm text-primary font-medium">{current.ctaHint}</p>
          ) : null}

          <div className="flex gap-1.5 pt-2" aria-hidden>
            {onboardingSteps.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i <= step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-6 bg-muted/30">
          <Button type="button" variant="ghost" size="sm" onClick={finish}>
            Überspringen
          </Button>
          <div className="flex gap-2">
            {!isFirst ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
              >
                Zurück
              </Button>
            ) : null}
            {isLast ? (
              <Button type="button" size="sm" onClick={finish}>
                Loslegen
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep((s) => s + 1)}
              >
                Weiter
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
