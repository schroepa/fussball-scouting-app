# Frontend-Konventionen

Kurze Regeln für Semantik, Naming und Testbarkeit.

## Landmarks & IDs

| ID | Bedeutung |
|---|---|
| `#app-shell` | Gesamtes App-Gerüst (Sidebar + Content) |
| `#app-sidebar` | Desktop-Sidebar |
| `#nav-sidebar` / `#nav-mobile` | Navigations-Landmarks |
| `#app-header-mobile` / `#app-header-desktop` | Chrome-Header |
| `#app-main` | Hauptinhalt (Skip-Link-Ziel) |
| `#page-*` | Seitenwurzel, z. B. `#page-home` |
| `#section-*` | Inhaltliche Abschnitte |
| `#form-*` / `#panel-*` | Interaktive Flächen |

## Semantik

- Echte Elemente nutzen: `main`, `nav`, `aside`, `header`, `section`, `form`
- Aktive Nav-Links: `aria-current="page"`
- Dekorative Icons: `aria-hidden="true"`
- Abschnitte mit sichtbarem Titel: `aria-labelledby`; sonst `aria-label`
- Skip-Link „Zum Inhalt springen“ bleibt im Layout

## CSS-Klassen

- Layout/Struktur: `app-shell`, `app-page`, `app-section` (semantischer Anker, nicht Design)
- Visuelles Styling weiter über Tailwind + shadcn-Tokens
- Keine generischen Utility-Klassen als einzige „Semantik“ ersetzen IDs/Landmarks

## Tests

- Pure Logik unter `src/lib/**/*.test.ts` (Vitest)
- CI: `.github/workflows/ci.yml` → `npm test` + `npm run build`
