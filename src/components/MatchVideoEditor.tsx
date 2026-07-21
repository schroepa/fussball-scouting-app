import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Match, MatchVideoMarker } from "@/lib/types";
import {
  isHttpUrl,
  summarizeMatchVideo,
} from "@/lib/match/video";
import { updateMatch } from "@/lib/local/repository";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

interface Props {
  match: Match;
  onSaved?: (match: Match) => void;
  compact?: boolean;
}

function newMarkerId(): string {
  return crypto.randomUUID();
}

export default function MatchVideoEditor({
  match,
  onSaved,
  compact = false,
}: Props) {
  const [videoUrl, setVideoUrl] = useState(match.videoUrl ?? "");
  const [videoRef, setVideoRef] = useState(match.videoRef ?? "");
  const [markers, setMarkers] = useState<MatchVideoMarker[]>(
    () => match.videoMarkers ?? []
  );
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);

  useEffect(() => {
    setVideoUrl(match.videoUrl ?? "");
    setVideoRef(match.videoRef ?? "");
    setMarkers(match.videoMarkers ?? []);
  }, [match.id, match.updatedAt]);

  const addMarker = () => {
    setMarkers((prev) => [
      ...prev,
      {
        id: newMarkerId(),
        abMinute: prev.length > 0 ? (prev[prev.length - 1].abMinute ?? 0) + 5 : 0,
        label: "",
        timecode: "",
        notiz: "",
      },
    ]);
  };

  const updateMarker = (id: string, patch: Partial<MatchVideoMarker>) => {
    setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMarker = (id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateMatch(match.id, {
        videoUrl: videoUrl.trim() || undefined,
        videoRef: videoRef.trim() || undefined,
        videoMarkers: markers.map((m) => ({
          id: m.id,
          abMinute: m.abMinute,
          timecode: m.timecode?.trim() || undefined,
          label: m.label?.trim() || undefined,
          notiz: m.notiz?.trim() || undefined,
        })),
      });
      if (updated) {
        onSaved?.(updated);
        setSavedHint(true);
        window.setTimeout(() => setSavedHint(false), 2000);
        window.dispatchEvent(new Event("scouting:synced"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`space-y-3 rounded-xl border border-border bg-muted/20 ${
        compact ? "p-3" : "p-4 md:p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Video / VEO</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Link speichern – kein Rohvideo-Upload.{" "}
            {summarizeMatchVideo({
              ...match,
              videoUrl,
              videoRef,
              videoMarkers: markers,
            })}
          </p>
        </div>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Speichern…" : "Speichern"}
        </Button>
      </div>

      {savedHint ? (
        <p className="text-xs text-primary font-medium">Gespeichert.</p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Video-URL</Label>
          <div className="flex gap-2">
            <Input
              type="url"
              className="h-9 text-sm"
              placeholder="https://… (VEO, YouTube, Drive, …)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            {isHttpUrl(videoUrl) ? (
              <a
                href={videoUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted"
                title="Öffnen"
              >
                <ExternalLink className="size-4" />
              </a>
            ) : null}
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">
            Bezeichnung / VEO-Ref
          </Label>
          <Input
            type="text"
            className="h-9 text-sm"
            placeholder="z. B. VEO U17 – 12.03."
            value={videoRef}
            onChange={(e) => setVideoRef(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">Zeitmarken</Label>
          <Button type="button" variant="outline" size="xs" onClick={addMarker}>
            <Plus data-icon="inline-start" />
            Marke
          </Button>
        </div>

        {markers.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Markiere Szenen mit Minute und/oder Timecode fürs Nachstudium.
          </p>
        ) : (
          <ul className="space-y-2">
            {markers.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-border bg-background p-2.5 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    className="h-8 w-20 text-sm"
                    placeholder="Min"
                    value={m.abMinute ?? ""}
                    onChange={(e) =>
                      updateMarker(m.id, {
                        abMinute:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value) || 0,
                      })
                    }
                  />
                  <Input
                    type="text"
                    className="h-8 flex-1 text-sm"
                    placeholder="Timecode (z. B. 00:12:34)"
                    value={m.timecode ?? ""}
                    onChange={(e) =>
                      updateMarker(m.id, { timecode: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    onClick={() => removeMarker(m.id)}
                    title="Entfernen"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <Input
                  type="text"
                  className="h-8 text-sm"
                  placeholder="Label (z. B. Pressing, Standard)"
                  value={m.label ?? ""}
                  onChange={(e) =>
                    updateMarker(m.id, { label: e.target.value })
                  }
                />
                <Input
                  type="text"
                  className="h-8 text-sm"
                  placeholder="Notiz"
                  value={m.notiz ?? ""}
                  onChange={(e) =>
                    updateMarker(m.id, { notiz: e.target.value })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
