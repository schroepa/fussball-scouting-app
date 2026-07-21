import {
  isHttpUrl,
  matchHasVideo,
  summarizeMatchVideo,
} from "@/lib/match/video";
import type { Match } from "@/lib/types";
import { ExternalLink } from "lucide-react";

export default function MatchVideoSummary({
  match,
}: {
  match: Match | undefined;
}) {
  if (!match || !matchHasVideo(match)) return null;

  const markers = [...(match.videoMarkers ?? [])].sort((a, b) => {
    const am = a.abMinute ?? 999;
    const bm = b.abMinute ?? 999;
    return am - bm;
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Video / VEO
          </div>
          <div className="font-medium mt-1">{summarizeMatchVideo(match)}</div>
        </div>
        {isHttpUrl(match.videoUrl) ? (
          <a
            href={match.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Öffnen
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>

      {match.videoUrl ? (
        <p className="text-xs text-muted-foreground break-all">{match.videoUrl}</p>
      ) : null}

      {markers.length > 0 ? (
        <ul className="space-y-1.5 border-t border-border pt-2">
          {markers.map((m) => (
            <li key={m.id} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {m.abMinute != null ? `ab ${m.abMinute}'` : "Marke"}
                {m.timecode ? ` · ${m.timecode}` : ""}
              </span>
              {m.label ? ` – ${m.label}` : ""}
              {m.notiz ? `: ${m.notiz}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
