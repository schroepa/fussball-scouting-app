import { useEffect, useRef, useState } from "react";

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
 * Nutzt `<input type="file" accept="image/*" capture="environment">` – das
 * funktioniert auf praktisch allen mobilen Browsern zuverlässig (öffnet die
 * native Kamera-App), ist offline-fähig und benötigt keine zusätzlichen
 * Berechtigungen/Prompts wie `getUserMedia`. Fotos werden sofort lokal als
 * Blob gespeichert (siehe src/lib/local/repository.ts::saveMediaBlob).
 */
export default function CameraCapture({ photos, onAdd, onRemove }: CameraCaptureProps) {
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
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative">
            <img
              src={photo.previewUrl}
              alt="Aufgenommenes Foto"
              className="w-20 h-20 object-cover rounded-lg border border-slate-200"
            />
            <button
              type="button"
              onClick={() => onRemove(photo.id)}
              aria-label="Foto entfernen"
              className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full w-6 h-6 text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-lg border-2 border-dashed border-slate-300 text-slate-600 py-3 font-medium flex items-center justify-center gap-2"
      >
        📷 Foto aufnehmen
      </button>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
