import { useEffect, useState, type FormEvent } from "react";
import ClubPicker from "./ClubPicker";
import { createPlayer } from "../lib/local/repository";

interface Props {
  onCreated?: () => void;
}

export default function CreatePlayerForm({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [position, setPosition] = useState("");
  const [geburtsdatum, setGeburtsdatum] = useState("");
  const [clubId, setClubId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!ok) return;
    const t = window.setTimeout(() => setOk(false), 2500);
    return () => window.clearTimeout(t);
  }, [ok]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!vorname.trim() || !nachname.trim()) {
      setError("Vor- und Nachname sind Pflicht.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPlayer({
        vorname: vorname.trim(),
        nachname: nachname.trim(),
        positionen: position.trim() ? [position.trim()] : [],
        geburtsdatum: geburtsdatum || undefined,
        aktuellerClubId: clubId,
      });
      setVorname("");
      setNachname("");
      setPosition("");
      setGeburtsdatum("");
      setClubId(undefined);
      setOpen(false);
      setOk(true);
      onCreated?.();
    } catch {
      setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="space-y-2">
        {ok && (
          <p className="text-sm text-emerald-700">✅ Spieler wurde angelegt.</p>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-lg bg-emerald-600 text-white py-2.5 font-medium"
        >
          + Spieler manuell anlegen
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Vorname"
          value={vorname}
          onChange={(e) => setVorname(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
          required
        />
        <input
          type="text"
          placeholder="Nachname"
          value={nachname}
          onChange={(e) => setNachname(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
          required
        />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Position (optional)"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <input
          type="date"
          value={geburtsdatum}
          onChange={(e) => setGeburtsdatum(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <ClubPicker
        label="Verein (optional)"
        value={clubId}
        onChange={(id) => setClubId(id || undefined)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-emerald-600 text-white py-2.5 font-medium disabled:opacity-50"
        >
          {saving ? "Speichere…" : "Spieler speichern"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 px-4 py-2.5"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
