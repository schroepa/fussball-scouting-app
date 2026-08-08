import { useEffect, useState } from "react";
import {
  ChartColumn,
  ClipboardList,
  Download,
  Home,
  LayoutGrid,
  Share2,
  TrendingUp,
  Users,
  UsersRound,
} from "lucide-react";
import { getCurrentSession } from "../lib/auth/session";
import { resolveAppMode } from "../lib/trainer/mode";
import type { AppMode } from "../lib/types";
import { cn } from "@/lib/utils";
import ModeSwitcher from "./ModeSwitcher";

type NavKey =
  | "home"
  | "dashboard"
  | "reports"
  | "players"
  | "import"
  | "kader"
  | "entwicklung"
  | "beobachtungen"
  | "freigaben"
  | "aufstellung";

const scoutNav = [
  { key: "home" as const, href: "/", label: "Übersicht", Icon: Home },
  {
    key: "dashboard" as const,
    href: "/dashboard",
    label: "Dashboard",
    Icon: ChartColumn,
  },
  {
    key: "reports" as const,
    href: "/reports",
    label: "Berichte",
    Icon: ClipboardList,
  },
  { key: "players" as const, href: "/players", label: "Spieler", Icon: Users },
  { key: "import" as const, href: "/import", label: "Import", Icon: Download },
];

const trainerNav = [
  { key: "home" as const, href: "/", label: "Übersicht", Icon: Home },
  { key: "kader" as const, href: "/kader", label: "Kader", Icon: UsersRound },
  {
    key: "entwicklung" as const,
    href: "/entwicklung",
    label: "Entwicklung",
    Icon: TrendingUp,
  },
  {
    key: "beobachtungen" as const,
    href: "/reports",
    label: "Beobachtungen",
    Icon: ClipboardList,
  },
  {
    key: "freigaben" as const,
    href: "/freigaben",
    label: "Freigaben",
    Icon: Share2,
  },
  {
    key: "aufstellung" as const,
    href: "/aufstellung",
    label: "Aufstellung",
    Icon: LayoutGrid,
  },
];

export default function AppNavigation({
  activeNav,
  variant,
}: {
  activeNav?: string;
  variant: "sidebar" | "mobile";
}) {
  const [mode, setMode] = useState<AppMode>("scout");

  useEffect(() => {
    const reload = async () => {
      const session = await getCurrentSession();
      setMode(resolveAppMode(session.scout));
    };
    void reload();
    const onChange = () => void reload();
    window.addEventListener("fusca:mode-changed", onChange);
    window.addEventListener("fusca:profile-changed", onChange);
    return () => {
      window.removeEventListener("fusca:mode-changed", onChange);
      window.removeEventListener("fusca:profile-changed", onChange);
    };
  }, []);

  const items = mode === "trainer" ? trainerNav : scoutNav;

  if (variant === "mobile") {
    return (
      <>
        {items.slice(0, 5).map((item) => {
          const active =
            activeNav === item.key ||
            (item.key === "beobachtungen" && activeNav === "reports") ||
            (item.key === "reports" && activeNav === "beobachtungen");
          const Icon = item.Icon;
          return (
            <a
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-medium min-w-[3.5rem] min-h-14",
                active ? "text-primary bg-primary/8" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </a>
          );
        })}
      </>
    );
  }

  return (
    <div className="space-y-1 flex-1 flex flex-col">
      <div className="px-2 pb-2">
        <ModeSwitcher className="w-full justify-stretch [&>button]:flex-1" />
      </div>
      <div className="space-y-1 flex-1">
        {items.map((item) => {
          const active =
            activeNav === item.key ||
            (item.key === "beobachtungen" && activeNav === "reports") ||
            (item.key === "reports" && activeNav === "beobachtungen");
          const Icon = item.Icon;
          return (
            <a
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export type { NavKey };
