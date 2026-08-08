/** Gemeinsame Hilfe- und Onboarding-Inhalte (deutsch). */

export type HelpSectionId =
  | "erste-schritte"
  | "privacy"
  | "offline-sync"
  | "mobil-desktop"
  | "berichte"
  | "attribute"
  | "formationen"
  | "video"
  | "import"
  | "dashboard"
  | "trainer"
  | "faq";

export type HelpGroupId = "einstieg" | "erfassen" | "auswerten" | "faq";

export interface HelpLink {
  href: string;
  label: string;
}

export interface HelpFaqItem {
  question: string;
  answer: string;
}

export interface HelpSection {
  id: HelpSectionId;
  group: HelpGroupId;
  title: string;
  summary: string;
  paragraphs: string[];
  bullets?: string[];
  tip?: string;
  links?: HelpLink[];
  /** Nur für die FAQ-Sektion; ersetzt paragraphs/bullets in der UI. */
  faqs?: HelpFaqItem[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  body: string;
  ctaHint?: string;
}

export const HELP_GROUP_LABELS: Record<HelpGroupId, string> = {
  einstieg: "Einstieg",
  erfassen: "Erfassen",
  auswerten: "Auswerten",
  faq: "FAQ",
};

export const ONBOARDING_STORAGE_KEY = "fusca_onboarding_v1_done";

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Willkommen bei Fussball Scouting",
    body: "Erfasse Beobachtungen am Spielfeldrand, synchronisiere sie und werte sie später am Desktop aus. Deine Daten bleiben privat – nur du siehst deine Spieler und Berichte.",
  },
  {
    id: "pitch",
    title: "Am Platz: schnell erfassen",
    body: "Öffne einen Spieler- oder Teambericht, wähle Bezug (Spiel/Training), setze die Raster-Noten und speichere. Ohne Netz speichert die App alles lokal auf dem Gerät.",
    ctaHint: "Tipp: Lege die App als PWA auf dem Homescreen ab.",
  },
  {
    id: "sync",
    title: "Sync, wenn Netz da ist",
    body: "Oben bzw. in der Sidebar siehst du den Sync-Status. Sobald du online und angemeldet bist, werden deine Berichte in die Cloud geschoben – und auf anderen Geräten wieder heruntergeladen.",
  },
  {
    id: "desktop",
    title: "Zuhause: Dashboard & Nachbereitung",
    body: "Am Desktop filterst und vergleichst du Spieler, pflegst Stammdaten und exportierst PDF/JSON. Importiere Kader von Transfermarkt oder fussball.de, statt alles tippen zu müssen.",
  },
  {
    id: "privacy",
    title: "Nur deine Beobachtungen",
    body: "Jeder Scout sieht ausschließlich die von ihm angelegten Spieler, Teams und Berichte. Wenn du die App weitergibst, sieht der andere Scout deine Testspieler nicht – und umgekehrt.",
    ctaHint: "Details jederzeit unter Hilfe nachlesen.",
  },
];

export const helpSections: HelpSection[] = [
  {
    id: "erste-schritte",
    group: "einstieg",
    title: "Erste Schritte",
    summary: "Anmelden, ersten Bericht schreiben, Sync prüfen.",
    paragraphs: [
      "Melde dich mit Google oder Magic Link an. Ohne konfiguriertes Supabase läuft die App im Lokal-Modus auf einem Gerät – geräteübergreifender Sync braucht Login.",
      "Praktischer Einstieg: Kader importieren, dann einen Spielerbericht am Platz anlegen. Am Desktop nachbereiten und im Dashboard vergleichen.",
    ],
    bullets: [
      "Übersicht → Spielerbericht oder Teambericht",
      "Sync-Status: Sidebar (Desktop) bzw. Header (Mobil)",
      "Einführung jederzeit über „Einführung starten“ auf dieser Seite",
    ],
    tip: "Am Platz: PWA auf dem Homescreen – volle Bildschirmfläche, schneller Start.",
    links: [
      { href: "/reports/new-player", label: "Spielerbericht" },
      { href: "/import", label: "Import" },
    ],
  },
  {
    id: "privacy",
    group: "einstieg",
    title: "Datenschutz & Sichtbarkeit",
    summary: "Jeder Scout sieht nur die eigenen Beobachtungen.",
    paragraphs: [
      "Spieler, Vereine, Spiele und Berichte gehören dem Scout, der sie angelegt hat. Andere Scouts können deine Einträge weder lesen noch bearbeiten.",
      "Derselbe reale Spieler (z. B. von Transfermarkt) kann bei zwei Scouts als getrennte Datensätze existieren – inklusive eigener Notizen und Bewertungen.",
    ],
    bullets: [
      "Kein gemeinsamer Pool aller Scouts im Team",
      "Nach Login werden fremde lokale Rest-Daten bereinigt",
      "Server-seitig: owner-scoped RLS muss in Supabase aktiv sein",
    ],
    tip: "Kurz gesagt: Was du beobachtest, bleibt bei dir.",
  },
  {
    id: "offline-sync",
    group: "einstieg",
    title: "Offline & Sync",
    summary: "Am Rand ohne Netz arbeiten, später nachziehen.",
    paragraphs: [
      "Alle Erfassungen landen zuerst lokal (IndexedDB). Ohne Internet bleibst du arbeitsfähig.",
      "Mit Verbindung und Login synchronisiert die App automatisch (Start, Online-Werden, nach Import). Die Sync-Leiste zeigt Warteschlange und Fehler.",
    ],
    bullets: [
      "Online / lokal: Statuspunkt in der Sync-Leiste",
      "Ausstehend: Änderungen warten auf Upload",
      "Fehler: Badge + „Retry“ / „Erneut versuchen“",
      "Hilfe-Link im Sync-Panel bei wiederkehrenden Problemen",
    ],
    tip: "Nach dem Spieltag einmal Sync prüfen – bevor du das zweite Gerät öffnest.",
  },
  {
    id: "mobil-desktop",
    group: "einstieg",
    title: "Mobil vs. Desktop",
    summary: "Drei Kontexte – eine App.",
    paragraphs: [
      "Spielfeldrand: schlanke Formulare, Bottom-Navigation, große Tap-Ziele.",
      "Nachbearbeitung Zuhause: Sidebar, Tabellen, Dashboard, Import und Export.",
      "Video-Studium: am Spiel VEO-/Video-Link und Zeitmarken – ohne Rohvideo-Upload.",
    ],
    bullets: [
      "Dark Mode: Mond-/Sonnen-Icon im Header oder in der Sidebar",
      "Desktop-Leiste: Schnellzugriff auf neue Berichte",
    ],
  },
  {
    id: "berichte",
    group: "erfassen",
    title: "Spieler- & Teamberichte",
    summary: "Raster, Bezug, Foto, Export.",
    paragraphs: [
      "Spielerberichte: Technik, Taktik, Athletik, Mentalität (plus eigene Felder), Gesamtnote, Empfehlung, Freitext, optional Foto.",
      "Teamberichte: Gegner-Analyse oder eigenes Team; Bezug Spiel / Training / sonstige Beobachtung.",
    ],
    bullets: [
      "PDF- und JSON-Export in der Detailansicht",
      "Bezug „Spiel“ → Formationen und Video am Match pflegen",
      "Listen filtern und Berichte nachbereiten",
    ],
    links: [
      { href: "/reports/new-player", label: "Neuer Spielerbericht" },
      { href: "/reports/new-team", label: "Neuer Teambericht" },
      { href: "/reports", label: "Alle Berichte" },
    ],
  },
  {
    id: "attribute",
    group: "erfassen",
    title: "Bewertungsfelder",
    summary: "Standard-Raster und eigene Kategorien.",
    paragraphs: [
      "Standard Spieler: Technik, Taktik, Athletik, Mentalität. Standard Team: Organisation, Pressing, Umschalten, Standards.",
      "Unter Bewertungsfelder legst du zusätzliche Skalen (1–10) an – getrennt für Spieler und Team. Custom-Felder gehören nur dir und synchronisieren geräteübergreifend.",
    ],
    tip: "Eigene Felder erscheinen in Formularen und im Dashboard (Radar, Vergleich, Verlauf).",
    links: [{ href: "/einstellungen/attribute", label: "Bewertungsfelder öffnen" }],
  },
  {
    id: "formationen",
    group: "erfassen",
    title: "Formationen & Phasen",
    summary: "Systeme und Wechsel am Spiel.",
    paragraphs: [
      "Beim Bezug „Spiel“ kannst du am Match unter „Formationen & Phasen“ Basis-Systeme für Heim und Gast (offensiv/defensiv) setzen.",
      "Phasen markieren Systemwechsel ab einer Minute – am Platz per Chip, zu Hause detailliert nachpflegen.",
    ],
    bullets: [
      "Chips für gängige Systeme (4-3-3, 4-2-3-1, …) plus Freitext",
      "Phasen mit optionaler Notiz",
      "Zusammenfassung in der Berichtsdetailansicht",
    ],
  },
  {
    id: "video",
    group: "erfassen",
    title: "Video / VEO",
    summary: "Link und Zeitmarken – kein Upload.",
    paragraphs: [
      "Am Spiel unter „Video / VEO“ hinterlegst du einen Link (VEO, YouTube, Drive, …) und optional eine Bezeichnung.",
      "Zeitmarken mit Spielminute und/oder Timecode helfen beim Nachstudium. Rohvideos werden nicht in der App-Cloud gespeichert.",
    ],
    bullets: [
      "Nur Link/Referenz – spart Storage",
      "Marken in der Berichtsdetailansicht",
      "Später optional: Event-Import – nie automatische Gesamtnote",
    ],
  },
  {
    id: "import",
    group: "erfassen",
    title: "Import",
    summary: "Kader übernehmen statt tippen.",
    paragraphs: [
      "Unter Import Quelle wählen, Treffer prüfen, übernehmen. Deduplizierung gilt pro Scout: derselbe externe Spieler wird bei dir nicht doppelt angelegt.",
      "Jugendkader auf fussball.de sind oft gesperrt – dann Namensliste oder manuell.",
    ],
    bullets: [
      "Transfermarkt: empfohlen für Jugend-/Vereinsskader",
      "fussball.de: Teams; Kader oft per Namensliste",
      "Spieler-Tab: TheSportsDB (bekannte Namen)",
      "API-Tab: braucht API_FUSSBALL_TOKEN",
      "Nach Übernehmen: Sync-Leiste prüfen",
    ],
    tip: "Nur öffentliche Scout-Quellen – Importe sparsam und für den eigenen Workflow.",
    links: [{ href: "/import", label: "Zum Import" }],
  },
  {
    id: "dashboard",
    group: "auswerten",
    title: "Dashboard",
    summary: "Filtern, vergleichen, Trends.",
    paragraphs: [
      "Im Dashboard siehst du Aggregationen deiner Spieler- und Teamberichte. Es erscheinen nur Daten, die du selbst erfasst hast.",
      "Radar, Verlauf und Vergleich nutzen dein Raster inklusive Custom-Felder.",
    ],
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/compare", label: "Spieler vergleichen" },
    ],
  },
  {
    id: "trainer",
    group: "einstieg",
    title: "Trainerbereich",
    summary: "Kader, Entwicklung, Freigaben, Aufstellung.",
    paragraphs: [
      "Unter Profil & Rollen kannst du die Rolle Trainer aktivieren (auch parallel zu Scout). Dann erscheint die Trainer-Navigation.",
      "Kader pflegt deine Mannschaft(en) mit Jahrgang und Einwilligung. Freigaben laufen gezielt per Code – kein Marktplatz. Aufstellung ist ein Positions-Board (Zeichenwerkzeug folgt in V2).",
    ],
    bullets: [
      "Mehrere Teams mit Umschalter",
      "Einwilligung steuert, ob Freigaben möglich sind",
      "Widerruf der Einwilligung beendet aktive Freigaben",
      "SQL: supabase/trainer_v1.sql",
    ],
    links: [
      { href: "/einstellungen/profil", label: "Profil & Rollen" },
      { href: "/kader", label: "Kader" },
    ],
  },
  {
    id: "faq",
    group: "faq",
    title: "Häufige Fragen",
    summary: "Kurze Antworten auf typische Fragen.",
    paragraphs: [],
    faqs: [
      {
        question: "Warum sieht ein anderer Scout meine Spieler?",
        answer:
          "Das sollte nach dem Privacy-Update nicht mehr passieren. App aktualisieren, anderen Account neu anmelden und syncen. Server-seitig müssen die owner-scoped RLS-Policies in Supabase aktiv sein (siehe README).",
      },
      {
        question: "Kann ich die Einführung erneut ansehen?",
        answer:
          "Ja – auf dieser Hilfeseite oben rechts „Einführung starten“.",
      },
      {
        question: "Wo stelle ich den Dark Mode um?",
        answer:
          "Über das Mond-/Sonnen-Icon im Header (Mobil), in der Sidebar oder der Desktop-Leiste. Die Wahl wird gespeichert.",
      },
      {
        question: "Wo landen Fotos?",
        answer:
          "Zuerst lokal am Gerät; bei Sync in deinem Storage, gebunden an deine Berichte – nicht sichtbar für andere Scouts.",
      },
      {
        question: "Sync zeigt Fehler – was tun?",
        answer:
          "Online prüfen, dann „Retry“ / „Erneut versuchen“ in der Sync-Leiste. Bleibt der Fehler: einmal ab- und neu anmelden; bei Import-Problemen Token/URL prüfen.",
      },
      {
        question: "Warum fehlen Formationen oder Video-Felder nach dem Deploy?",
        answer:
          "Die SQL-Skripte match_formations.sql, match_video.sql und ggf. attribute_definitions_owner.sql müssen im Supabase SQL-Editor ausgeführt worden sein.",
      },
    ],
  },
];

export function helpSectionsByGroup(): {
  group: HelpGroupId;
  label: string;
  sections: HelpSection[];
}[] {
  const order: HelpGroupId[] = ["einstieg", "erfassen", "auswerten", "faq"];
  return order.map((group) => ({
    group,
    label: HELP_GROUP_LABELS[group],
    sections: helpSections.filter((s) => s.group === group),
  }));
}
