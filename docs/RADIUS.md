# Radius-System

Werkzeug-UI: eher eckig als „pillig“. Verschachtelte Radien folgen der Konzentrizitätsregel.

## Regel

```
R_außen ≈ R_innen + Padding
```

Beispiel: Card `rounded-xl` (12px) + Content-Padding `0.75rem` (12px) → innere Rows `rounded-md` (6px) liegen nah an der Idealform (`6 + 12 = 18`, optisch abgestimmt durch geringeres Card-Spacing `sm`).

## Tokens (`global.css`)

| Token | Wert | Einsatz |
|---|---|---|
| `--radius-sm` | 4px | feine Chips |
| `--radius-md` | 6px | **innere** Rows / nested Surfaces |
| `--radius-lg` | 8px | Buttons, Inputs, Selects |
| `--radius-xl` | 12px | **äußere** Cards / Panels |
| `--radius-2xl`…`4xl` | 12px (gekappt) | Alt-Klassen dürfen nicht aufblasen |

## Utilities

- `.surface-nested-outer` → `rounded-xl`
- `.surface-nested-inner` → `rounded-md`

## Checkliste bei neuen UI-Flächen

1. Äußere Container: `rounded-xl` (oder Card-Primitive)
2. Inhalt mit eigenem Border: `rounded-md`, Padding der Parent-Card beachten
3. Keine `rounded-full` / `rounded-3xl` für Rechteck-Surfaces (außer echte Pills/Avatare)
4. Buttons/Inputs immer `rounded-lg`
