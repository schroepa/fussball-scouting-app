import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

export interface CapturedPhoto {
  id: string;
  blob: Blob;
  previewUrl: string;
}

interface CameraCaptureProps {
  photos: CapturedPhoto[];
  onAdd: (photo: CapturedPhoto) => void;
  onRemove: (id: string) => void;
}

/**
 * Foto-Aufnahme direkt aus der App.
 *
 * Nutzt `<input type="file" accept="image/*" capture="environment">` –
 * mobil öffnet das die Kamera, am Desktop die Dateiauswahl.
 */
export default function CameraCapture({
  photos,
  onAdd,
  onRemove,
}: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Bitte ein Foto aufnehmen oder ein Bild auswählen.");
      return;
    }
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    onAdd({ id: crypto.randomUUID(), blob: file, previewUrl });
  };

  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative">
              <img
                src={photo.previewUrl}
                alt="Aufgenommenes Foto"
                className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl border border-border"
              />
              <button
                type="button"
                onClick={() => onRemove(photo.id)}
                aria-label="Foto entfernen"
                className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-foreground text-background grid place-items-center shadow-sm"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed h-11"
        onClick={() => inputRef.current?.click()}
      >
        <Camera data-icon="inline-start" />
        Foto aufnehmen / auswählen
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
