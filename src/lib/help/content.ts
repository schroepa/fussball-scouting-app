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
  | "faq";

export interface HelpSection {
  id: HelpSectionId;
  title: string;
  summary: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  body: string;
  ctaHint?: string;
}

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
    title: "Erste Schritte",
    summary: "Anmelden, ersten Bericht schreiben, Sync prüfen.",
    paragraphs: [
      "Melde dich mit Google oder Magic Link an. Ohne Login funktioniert die App lokal auf einem Gerät; geräteübergreifender Sync braucht eine Anmeldung.",
      "Starte mit einem Spielerbericht oder importiere zuerst einen Kader, damit du Spieler nicht manuell anlegen musst.",
    ],
    bullets: [
      "Übersicht → Spielerbericht oder Teambericht",
      "Sync-Status in der Sidebar (Desktop) bzw. oben rechts (Mobil)",
      "Hilfe jederzeit über die Navigation oder den Menüpunkt „Hilfe“",
    ],
  },
  {
    id: "privacy",
    title: "Datenschutz & Sichtbarkeit",
    summary: "Jeder Scout sieht nur die eigenen Beobachtungen.",
    paragraphs: [
      "Spieler, Vereine, Spiele und Berichte gehören dem Scout, der sie angelegt hat. Andere Scouts können deine Einträge weder lesen noch bearbeiten.",
      "Derselbe reale Spieler (z. B. von Transfermarkt) kann bei zwei Scouts als getrennte Datensätze existieren – inkl. eigener Notizen und Bewertungen.",
    ],
    bullets: [
      "Kein gemeinsamer Pool aller Scouts im Team",
      "Nach Login werden fremde lokale Rest-Daten bereinigt",
      "Feedback-Test: zweiter Account darf deine Testspieler nicht sehen",
    ],
  },
  {
    id: "offline-sync",
    title: "Offline & Sync",
    summary: "Am Rand ohne Netz arbeiten, später nachziehen.",
    paragraphs: [
      "Alle Erfassungen landen zuerst in der lokalen Datenbank (IndexedDB). Ohne Internet bleibst du arbeitsfähig.",
      "Sobald Verbindung und Login bestehen, synchronisiert die App automatisch (beim Start, online gehen, nach Import). Der Sync-Status zeigt ausstehende bzw. fehlgeschlagene Uploads.",
    ],
    bullets: [
      "Grün / ok: alles synchron",
      "Ausstehend: lokale Änderungen warten auf Upload",
      "Fehler: roter Badge und „Retry“ / „Erneut versuchen“ in der Sync-Leiste",
    ],
  },
  {
    id: "mobil-desktop",
    title: "Mobil vs. Desktop",
    summary: "Drei Nutzungskontexte – eine App.",
    paragraphs: [
      "Spielfeldrand: schlanke Formulare, Bottom-Navigation, schnelle Erfassung.",
      "Nachbearbeitung Zuhause: Sidebar, breitere Tabellen, Dashboard und Export.",
      "Video-Studium: Am Spiel einen VEO-/Video-Link und Zeitmarken hinterlegen – ohne Rohvideo-Upload.",
    ],
  },
  {
    id: "berichte",
    title: "Spieler- & Teamberichte",
    summary: "Raster, Bezugstyp, Foto, Export.",
    paragraphs: [
      "Spielerberichte nutzen das Bewertungsraster (Technik, Taktik, Athletik, Mentalität), Gesamtnote, Empfehlung und Freitext. Optional kannst du direkt ein Foto machen.",
      "Teamberichte dienen der Gegner-Analyse oder der Einschätzung des eigenen Teams. Wähle den Bezug (Spiel, Training, sonstige Beobachtung).",
    ],
    bullets: [
      "PDF- und JSON-Export in der Berichtsdetailansicht",
      "Listen filtern und Berichte nachbereiten",
      "Formationen Heim/Gast × off/def und Phasen am Spiel (nicht nur Freitext am Team-Bericht)",
      "Eigene Bewertungsfelder unter Einstellungen → Bewertungsfelder",
    ],
  },
  {
    id: "attribute",
    title: "Bewertungsfelder",
    summary: "Standard-Raster und eigene Kategorien.",
    paragraphs: [
      "Jeder Spielerbericht nutzt Technik, Taktik, Athletik und Mentalität. Unter Bewertungsfelder legst du zusätzliche Skalen an (z. B. Kopfballspiel) – sie erscheinen automatisch im Formular.",
      "Custom-Felder gehören nur dir und synchronisieren geräteübergreifend.",
    ],
  },
  {
    id: "formationen",
    title: "Formationen & Phasen",
    summary: "Systeme und Systemwechsel am Spiel.",
    paragraphs: [
      "Wenn der Bericht den Bezug „Spiel“ hat, kannst du am ausgewählten Spiel unter „Formationen & Phasen“ Basis-Systeme für Heim und Gast (offensiv/defensiv) setzen.",
      "Phasen markieren Systemwechsel ab einer Minute – ideal am Platz per Chip, Zuhause detailliert nachpflegen.",
    ],
    bullets: [
      "Chips für gängige Systeme (4-3-3, 4-2-3-1, …) plus Freitext",
      "Phasen mit optionaler Notiz",
      "Anzeige in der Berichtsdetailansicht",
    ],
  },
  {
    id: "import",
    title: "Import",
    summary: "Kader von Transfermarkt, fussball.de oder manuell.",
    paragraphs: [
      "Unter Import wählst du eine Quelle, prüfst die Treffer und übernimmst sie. Deduplizierung gilt pro Scout: derselbe externe Spieler wird bei dir nicht doppelt angelegt – bei einem anderen Scout kann er als eigener Datensatz existieren.",
      "Jugendkader auf fussball.de sind oft gesperrt – dann Namensliste einfügen oder manuell anlegen.",
    ],
    bullets: [
      "Transfermarkt: empfohlen für Jugend-/Vereinsskader",
      "fussball.de: Verein/Teams; Kader oft nur per Namensliste",
      "Spieler-Tab: TheSportsDB (eher bekannte/Profi-Namen)",
      "API-Tab fussball.de braucht API_FUSSBALL_TOKEN in der .env",
      "Nach Übernehmen: Sync-Status in der Leiste prüfen",
    ],
  },
  {
    id: "video",
    title: "Video / VEO",
    summary: "Link und Zeitmarken am Spiel – kein Upload.",
    paragraphs: [
      "Am ausgewählten Spiel unter „Video / VEO“ hinterlegst du einen Link (VEO, YouTube, Drive, …) und optional eine Bezeichnung.",
      "Zeitmarken mit Spielminute und/oder Timecode helfen beim Nachstudium. Rohvideos werden nicht in der Cloud gespeichert.",
    ],
    bullets: [
      "Nur Link/Referenz, kein Storage-Verbrauch durch Videodateien",
      "Marken erscheinen in der Berichtsdetailansicht",
      "Später optional: Event-Import aus VEO-Export – nie automatische Gesamtnote",
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    summary: "Auswerten, filtern, vergleichen.",
    paragraphs: [
      "Im Dashboard siehst du Aggregationen deiner Spieler- und Teamberichte, Trends und einen Spielervergleich. Es erscheinen nur Daten, die du selbst erfasst hast.",
      "Radar, Verlauf und Vergleich nutzen dein Bewertungsraster inklusive eigener Custom-Felder.",
    ],
  },
  {
    id: "faq",
    title: "Häufige Fragen",
    summary: "Kurze Antworten auf typische Feedback-Fragen.",
    paragraphs: [
      "Warum sieht ein anderer Scout meine Spieler? Das sollte nach dem Privacy-Update nicht mehr passieren. Stelle sicher, dass die App aktuell ist und der andere Account neu angemeldet/synchronisiert hat. Server-seitig müssen die owner-scoped RLS-Policies aktiv sein.",
      "Kann ich die Einführung erneut ansehen? Ja – auf der Hilfeseite unter „Einführung erneut starten“.",
      "Wo speichern sich Fotos? Lokal und bei Sync in deinem Storage-Konto; sie hängen an deinen Berichten.",
    ],
  },
];
