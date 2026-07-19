import { useEffect, useState } from "react";
import { getCurrentSession, signOut } from "../lib/auth/session";
import type { Scout } from "../lib/types";
import { cn } from "@/lib/utils";

type Variant = "header" | "sidebar";

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
  const isHeader = variant === "header";

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        !isHeader && "justify-between w-full"
      )}
    >
      <span
        className={cn(
          "truncate text-sm",
          isHeader
            ? "hidden sm:inline text-primary-foreground/80 max-w-[8rem]"
            : "text-foreground max-w-[9rem]"
        )}
        title={scout.email}
      >
        {shortName}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        className={cn(
          "rounded-md px-2 py-1 text-xs font-medium",
          isHeader
            ? "bg-white/10 hover:bg-white/20 text-primary-foreground"
            : "border border-border hover:bg-muted"
        )}
        title="Abmelden"
      >
        Logout
      </button>
    </div>
  );
}
