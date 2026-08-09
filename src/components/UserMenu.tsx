import { useEffect, useState } from "react";
import { getCurrentSession, signOut } from "../lib/auth/session";
import type { Scout } from "../lib/types";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

type Variant = "header" | "header-compact" | "sidebar";

export default function UserMenu({
  variant = "header",
}: {
  variant?: Variant;
}) {
  const [scout, setScout] = useState<Scout | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    getCurrentSession().then((session) => {
      setScout(session.scout);
      setAuthenticated(session.isAuthenticated);
    });
  }, []);

  if (!authenticated || !scout) return null;

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const shortName = scout.name.split(" ")[0] || scout.email || "Scout";
  const compact = variant === "header-compact";
  const isHeader = variant === "header" || compact;

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted focus-ring"
        title={`Abmelden (${shortName})`}
        aria-label={`Abmelden (${shortName})`}
      >
        <LogOut className="size-4" aria-hidden="true" strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        !isHeader && "justify-between w-full"
      )}
    >
      <span
        className={cn(
          "truncate text-sm text-muted-foreground",
          isHeader ? "hidden sm:inline max-w-[6rem]" : "max-w-[9rem] text-foreground"
        )}
        title={scout.email}
      >
        {shortName}
      </span>
      {!isHeader ? (
        <a
          href="/hilfe"
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline focus-ring rounded-sm min-h-9 inline-flex items-center px-1"
        >
          Hilfe
        </a>
      ) : null}
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted min-h-9 focus-ring"
        title="Abmelden"
        aria-label="Abmelden"
      >
        Logout
      </button>
    </div>
  );
}
