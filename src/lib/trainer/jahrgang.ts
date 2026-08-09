/**
 * Normalisiert Jahrgang-Eingaben zu einer Ganzzahl (z. B. 2012).
 * Verhindert Sync-Fehler wie `invalid input syntax for type integer: "0.2012"`.
 */
export function parseJahrgang(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;

  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return undefined;
    return normalizeYear(raw);
  }

  const text = String(raw).trim().replace(",", ".");
  if (!text) return undefined;

  // Reine 4-stellige Jahreszahl
  const four = text.match(/^(19|20)\d{2}$/);
  if (four) return Number(four[0]);

  // 2-stellig → 20xx (Jugendjahrgänge)
  if (/^\d{2}$/.test(text)) {
    const n = Number(text);
    return n >= 0 && n <= 99 ? 2000 + n : undefined;
  }

  // Dezimalfehlertyp "0.2012" / ".2012" → 2012
  const decimalYear = text.match(/^0?\.((?:19|20)\d{2})$/);
  if (decimalYear) return Number(decimalYear[1]);

  // Sonst erste 4-stellige Jahreszahl im String
  const embedded = text.match(/(?:19|20)\d{2}/);
  if (embedded) return Number(embedded[0]);

  const asNum = Number(text);
  if (!Number.isFinite(asNum)) return undefined;
  return normalizeYear(asNum);
}

function normalizeYear(n: number): number | undefined {
  // 0.2012 → oft Tippfehler/Locale: als 2012 interpretieren
  if (n > 0 && n < 1) {
    const scaled = Math.round(n * 10000);
    if (scaled >= 1900 && scaled <= 2100) return scaled;
  }
  const year = Math.round(n);
  if (year >= 1900 && year <= 2100) return year;
  if (year >= 0 && year <= 99) return 2000 + year;
  return undefined;
}

export function formatJahrgang(jahrgang: number | undefined): string {
  const y = parseJahrgang(jahrgang);
  return y !== undefined ? String(y) : "–";
}
