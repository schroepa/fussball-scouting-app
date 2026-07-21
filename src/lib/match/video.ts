import type { Match, MatchVideoMarker } from "../types";

export function matchHasVideo(match: Match | undefined | null): boolean {
  if (!match) return false;
  return Boolean(
    match.videoUrl ||
      match.videoRef ||
      (match.videoMarkers && match.videoMarkers.length > 0)
  );
}

export function summarizeMatchVideo(match: Match): string {
  const parts: string[] = [];
  if (match.videoRef) parts.push(match.videoRef);
  else if (match.videoUrl) parts.push("Video-Link");
  const n = match.videoMarkers?.length ?? 0;
  if (n > 0) parts.push(`${n} Marke${n === 1 ? "" : "n"}`);
  return parts.join(" · ") || "Kein Video";
}

export function parseVideoMarkersFromRemote(value: unknown): MatchVideoMarker[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw, index) => {
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Record<string, unknown>;
      const abRaw = row.abMinute ?? row.ab_minute;
      const abMinute =
        abRaw === null || abRaw === undefined || abRaw === ""
          ? undefined
          : Number(abRaw);
      return {
        id: String(row.id ?? `marker-${index}`),
        abMinute:
          abMinute !== undefined && Number.isFinite(abMinute)
            ? abMinute
            : undefined,
        timecode: (row.timecode as string | undefined) ?? undefined,
        label: (row.label as string | undefined) ?? undefined,
        notiz: (row.notiz as string | undefined) ?? undefined,
      } satisfies MatchVideoMarker;
    })
    .filter((m): m is MatchVideoMarker => m !== null);
}

/** Öffnet den Link in neuem Tab, wenn gültig. */
export function isHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
