import { useEffect, useState } from "react";
import { getCurrentSession, signOut } from "../lib/auth/session";
import type { Scout } from "../lib/types";

export default function UserMenu() {
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

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline text-slate-300 truncate max-w-[8rem]" title={scout.email}>
        {shortName}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-md bg-white/10 hover:bg-white/20 px-2 py-1 font-medium"
        title="Abmelden"
      >
        Logout
      </button>
    </div>
  );
}
