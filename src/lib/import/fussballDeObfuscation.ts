/**
 * fussball.de verschleiert Spielernamen mit PUA-Codepoints + Custom-Font.
 * Die Glyph-Namen im Font entsprechen den echten Buchstaben.
 */
import opentype from "opentype.js";
import type { Font } from "opentype.js";

const FONT_CACHE = new Map<string, Font>();

const SPECIAL_GLYPHS: Record<string, string> = {
  space: " ",
  comma: ",",
  period: ".",
  hyphen: "-",
  minus: "-",
  quotedbl: '"',
  quotesingle: "'",
  quoteright: "'",
  quoteleft: "'",
  adieresis: "ä",
  odieresis: "ö",
  udieresis: "ü",
  Adieresis: "Ä",
  Odieresis: "Ö",
  Udieresis: "Ü",
  germandbls: "ß",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  agrave: "à",
  egrave: "è",
  igrave: "ì",
  ograve: "ò",
  ugrave: "ù",
  acircumflex: "â",
  ecircumflex: "ê",
  icircumflex: "î",
  ocircumflex: "ô",
  ucircumflex: "û",
  atilde: "ã",
  ntilde: "ñ",
  otilde: "õ",
  ccedilla: "ç",
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

function glyphNameToChar(name: string | undefined): string | null {
  if (!name || name === ".notdef") return null;
  if (SPECIAL_GLYPHS[name]) return SPECIAL_GLYPHS[name];
  if (name.length === 1) return name;
  if (/^uni[0-9A-Fa-f]{4}$/.test(name)) {
    return String.fromCodePoint(parseInt(name.slice(3), 16));
  }
  if (/^u[0-9A-Fa-f]{4,6}$/.test(name)) {
    return String.fromCodePoint(parseInt(name.slice(1), 16));
  }
  return null;
}

async function loadFont(fontId: string): Promise<Font> {
  const cached = FONT_CACHE.get(fontId);
  if (cached) return cached;

  const url = `https://www.fussball.de/export.fontface/-/format/woff/id/${encodeURIComponent(fontId)}/type/font`;
  const res = await fetch(url, {
    headers: { "User-Agent": fussballUserAgent() },
  });
  if (!res.ok) {
    throw new Error(`Schriftart für Namensentschlüsselung nicht ladbar (HTTP ${res.status}).`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const font = opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  );
  FONT_CACHE.set(fontId, font);
  return font;
}

export function fussballUserAgent(): string {
  return "FussballScoutingApp/0.1 (+https://github.com/schroepa/fussball-scouting-app; personal scouting import)";
}

export async function decodeObfuscatedHtml(
  htmlEntities: string,
  fontId: string
): Promise<string> {
  const font = await loadFont(fontId);
  return htmlEntities.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex: string) => {
    const code = parseInt(hex, 16);
    if (code === 0x20) return " ";
    const glyph = font.charToGlyph(String.fromCodePoint(code));
    return glyphNameToChar(glyph.name ?? undefined) ?? "";
  });
}
