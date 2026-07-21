import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "fusca_home_tips_dismissed";

/**
 * Ausblendbare Hinweis-Kacheln auf der Übersicht.
 * Nach dem ersten Ausblenden bleiben sie weg (localStorage).
 */
export default function HomeTips() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section
      id="section-tips"
      className="app-section grid grid-cols-1 lg:grid-cols-3 gap-4"
      aria-labelledby="home-tips-title"
    >
      <div className="lg:col-span-3 flex items-center justify-between gap-2">
        <h2 id="home-tips-title" className="text-sm font-medium text-muted-foreground">
          Hinweise
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
          Ausblenden
        </Button>
      </div>
      <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 md:p-5">
        <h3 className="font-semibold tracking-tight mb-2">Tipp für den Desktop</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Nutze die Seitenleiste für schnellen Wechsel zwischen Berichten,
          Spielern und Import. Formulare und Tabellen nutzen auf großen
          Bildschirmen die volle Breite – ideal zum Nachbereiten nach dem Spiel.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-accent/60 p-4 md:p-5">
        <h3 className="font-semibold tracking-tight mb-2 text-accent-foreground">
          Offline mobil
        </h3>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Am Spielfeldrand speichert die App lokal. Sync oben rechts bzw. in der
          Sidebar, sobald wieder Netz da ist.
        </p>
      </div>
    </section>
  );
}
