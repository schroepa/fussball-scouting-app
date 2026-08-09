import SyncStatusBar from "./SyncStatusBar";
import UserMenu from "./UserMenu";
import ThemeToggle from "./ThemeToggle";

/**
 * Kompakter Mobile-Header – kein Modus-Umschalter hier (liegt unter „Mehr“),
 * damit nichts horizontal überläuft.
 */
export default function MobileHeader() {
  return (
    <header
      id="app-header-mobile"
      className="md:hidden sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 backdrop-blur px-3 py-2 min-w-0 overflow-hidden"
    >
      <a
        href="/"
        className="font-semibold tracking-tight flex items-center gap-2 text-foreground min-h-10 shrink-0 min-w-0"
      >
        <span
          className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center text-[10px] font-bold shrink-0"
          aria-hidden="true"
        >
          FS
        </span>
        <span className="text-sm truncate">Fusca</span>
      </a>
      <div
        className="ml-auto flex items-center gap-1 min-w-0 shrink"
        aria-label="Konto und Sync"
      >
        <ThemeToggle variant="header" />
        <SyncStatusBar variant="header-compact" />
        <UserMenu variant="header-compact" />
      </div>
    </header>
  );
}
