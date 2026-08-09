import { useEffect, useState } from "react";
import {
  ChartColumn,
  ClipboardList,
  Download,
  Home,
  LayoutGrid,
  Menu,
  Share2,
  TrendingUp,
  Users,
  UsersRound,
  CircleHelp,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { getCurrentSession } from "../lib/auth/session";
import { resolveAppMode } from "../lib/trainer/mode";
import type { AppMode } from "../lib/types";
import { cn } from "@/lib/utils";
import ModeSwitcher from "./ModeSwitcher";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = {
  key: string;
  href: string;
  label: string;
  Icon: typeof Home;
};

const scoutPrimary: NavItem[] = [
  { key: "home", href: "/", label: "Start", Icon: Home },
  { key: "reports", href: "/reports", label: "Berichte", Icon: ClipboardList },
  { key: "players", href: "/players", label: "Spieler", Icon: Users },
];

const scoutMore: NavItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", Icon: ChartColumn },
  { key: "import", href: "/import", label: "Import", Icon: Download },
  {
    key: "attribute",
    href: "/einstellungen/attribute",
    label: "Bewertungsfelder",
    Icon: SlidersHorizontal,
  },
  {
    key: "profil",
    href: "/einstellungen/profil",
    label: "Profil & Rollen",
    Icon: UserRound,
  },
  { key: "hilfe", href: "/hilfe", label: "Hilfe", Icon: CircleHelp },
];

/** Mobil nur 3 Primärziele, Rest unter „Mehr“ (inkl. Aufstellung). */
const trainerPrimary: NavItem[] = [
  { key: "home", href: "/", label: "Start", Icon: Home },
  { key: "kader", href: "/kader", label: "Kader", Icon: UsersRound },
  {
    key: "beobachtungen",
    href: "/reports",
    label: "Beobachtungen",
    Icon: ClipboardList,
  },
];

const trainerMore: NavItem[] = [
  {
    key: "aufstellung",
    href: "/aufstellung",
    label: "Aufstellung",
    Icon: LayoutGrid,
  },
  {
    key: "entwicklung",
    href: "/entwicklung",
    label: "Entwicklung",
    Icon: TrendingUp,
  },
  { key: "freigaben", href: "/freigaben", label: "Freigaben", Icon: Share2 },
  { key: "dashboard", href: "/dashboard", label: "Auswertung", Icon: ChartColumn },
  {
    key: "profil",
    href: "/einstellungen/profil",
    label: "Profil & Rollen",
    Icon: UserRound,
  },
  {
    key: "attribute",
    href: "/einstellungen/attribute",
    label: "Bewertungsfelder",
    Icon: SlidersHorizontal,
  },
  { key: "hilfe", href: "/hilfe", label: "Hilfe", Icon: CircleHelp },
];

const scoutSidebar = [...scoutPrimary, ...scoutMore.filter((i) => i.key !== "hilfe" && i.key !== "profil" && i.key !== "attribute")];
const trainerSidebar = [
  ...trainerPrimary,
  ...trainerMore.filter((i) =>
    ["aufstellung", "entwicklung", "freigaben"].includes(i.key)
  ),
];

function isActive(activeNav: string | undefined, key: string) {
  return (
    activeNav === key ||
    (key === "beobachtungen" && activeNav === "reports") ||
    (key === "reports" && activeNav === "beobachtungen")
  );
}

export default function AppNavigation({
  activeNav,
  variant,
}: {
  activeNav?: string;
  variant: "sidebar" | "mobile";
}) {
  const [mode, setMode] = useState<AppMode>("scout");
  const [moreOpen, setMoreOpen] = useState(false);

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

  const primary = mode === "trainer" ? trainerPrimary : scoutPrimary;
  const more = mode === "trainer" ? trainerMore : scoutMore;
  const sidebarItems = mode === "trainer" ? trainerSidebar : scoutSidebar;
  const moreActive = more.some((i) => isActive(activeNav, i.key));

  if (variant === "mobile") {
    return (
      <>
        {primary.map((item) => {
          const active = isActive(activeNav, item.key);
          const Icon = item.Icon;
          return (
            <a
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-2xl text-[11px] font-medium min-h-14 min-w-0 focus-ring",
                active
                  ? "nav-active"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon
                className={cn("size-5 shrink-0", active ? "opacity-100" : "opacity-70")}
                aria-hidden="true"
                strokeWidth={1.75}
              />
              <span className="truncate max-w-full">{item.label}</span>
            </a>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-2xl text-[11px] font-medium min-h-14 min-w-0 focus-ring",
              moreActive
                ? "nav-active"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            aria-label="Mehr Menü öffnen"
            aria-expanded={moreOpen}
          >
            <Menu className="size-5 shrink-0 opacity-70" aria-hidden="true" strokeWidth={1.75} />
            <span>Mehr</span>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] rounded-t-[1.25rem] pb-[max(1rem,env(safe-area-inset-bottom))] border-border bg-card"
          >
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle>Mehr</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-3">
              <ModeSwitcher className="w-full justify-stretch [&>button]:flex-1" />
            </div>
            <nav className="px-2 pb-4 space-y-0.5" aria-label="Weitere Bereiche">
              {more.map((item) => {
                const active = isActive(activeNav, item.key);
                const Icon = item.Icon;
                return (
                  <a
                    key={item.key}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium min-h-11 focus-ring",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={() => setMoreOpen(false)}
                  >
                    <Icon className="size-4 shrink-0 opacity-80" aria-hidden="true" strokeWidth={1.75} />
                    {item.label}
                  </a>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div className="space-y-1 flex-1 flex flex-col min-h-0">
      <div className="px-0.5 pb-3">
        <ModeSwitcher className="w-full justify-stretch [&>button]:flex-1" />
      </div>
      <p className="px-2.5 pb-1.5 label-caps">Navigation</p>
      <div className="space-y-1 flex-1 overflow-y-auto">
        {sidebarItems.map((item) => {
          const active = isActive(activeNav, item.key);
          const Icon = item.Icon;
          return (
            <a
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors min-h-11 focus-ring",
                active
                  ? "nav-active"
                  : "text-sidebar-foreground/70 hover:bg-muted/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4 shrink-0 opacity-75" aria-hidden="true" strokeWidth={1.75} />
              {item.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
