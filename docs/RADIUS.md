# Radius-System

Werkzeug-UI: eher eckig als „pillig“. **Äußere Surfaces max. 16px.**

## Regel

```
R_außen ≈ R_innen + Padding
R_außen ≤ 16px
```

## Tokens (`global.css`)

| Token | Wert | Einsatz |
|---|---|---|
| `--radius-sm` | 4px | feine Chips |
| `--radius-md` | 6px | **innere** Rows / nested Surfaces |
| `--radius-lg` | 8px | Buttons, Inputs, Selects |
| `--radius-outer` / `--radius-xl` | **16px** | **äußere** Cards / Panels (Maximum) |
| `--radius-2xl`…`4xl` | **16px** (gekappt) | verhindert alte 31px-Pills (`0.75rem × 2.6`) |

Cards setzen den Radius zusätzlich über `[data-slot="card"] { border-radius: var(--radius-outer) }`.

## Utilities

- `.surface-nested-outer` → `var(--radius-outer)` (16px)
- `.surface-nested-inner` → `rounded-md` (6px)

## Checkliste

1. Äußere Container: Card-Primitive oder max. 16px
2. Inhalt mit Border: `rounded-md`
3. Keine echten `rounded-full`-Rechtecke (nur Avatare/Progress)
4. Buttons/Inputs: `rounded-lg` (8px)
