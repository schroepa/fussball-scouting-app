import { useState, type FormEvent } from "react";
import CameraCapture, { type CapturedPhoto } from "./CameraCapture";
import ClubPicker from "./ClubPicker";
import PlayerPicker from "./PlayerPicker";
import BezugstypSelector from "./BezugstypSelector";
import { createTeamReport, saveMediaBlob } from "../lib/local/repository";
import type { Berichtsart, Bezugstyp, MediaRef, Player } from "../lib/types";
import { BERICHTSART_LABELS } from "../lib/types";

const BERICHTSART_OPTIONS: { value: Berichtsart; icon: string }[] = [
  { value: "gegner_analyse", icon: "🎯" },
  { value: "eigenes_team", icon: "🏠" },
];

export default function TeamReportForm() {
  const [berichtsart, setBerichtsart] = useState<Berichtsart>("gegner_analyse");
  const [clubId, setClubId] = useState<string>("");
  const [bezugstyp, setBezugstyp] = useState<Bezugstyp>("spiel");
  const [matchId, setMatchId] = useState<string>("");
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [formation, setFormation] = useState("");
  const [spielstil, setSpielstil] = useState("");
  const [standardsituationen, setStandardsituationen] = useState("");
  const [staerken, setStaerken] = useState("");
  const [schwaechen, setSchwaechen] = useState("");
  const [schluesselspieler, setSchluesselspieler] = useState<Player[]>([]);
  const [addingKeyPlayer, setAddingKeyPlayer] = useState(false);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clubId) {
      setError("Bitte einen Verein auswählen oder anlegen.");
      return;
    }
    if (bezugstyp === "spiel" && !matchId) {
      setError("Bitte ein Spiel auswählen oder anlegen.");
      return;
    }

    setSaving(true);
    try {
      const media: MediaRef[] = [];
      for (const photo of photos) {
        const ref = await saveMediaBlob(photo.blob, photo.blob.type || "image/jpeg");
        media.push(ref);
      }

      const { getCurrentSession } = await import("../lib/auth/session");
      const session = await getCurrentSession();

      const report = await createTeamReport({
        clubId,
        scoutId: session.scout.id,
        berichtsart,
        bezugstyp,
        matchId: bezugstyp === "spiel" ? matchId : undefined,
        datum: new Date(datum).toISOString(),
        formation: formation || undefined,
        spielstil: spielstil || undefined,
        standardsituationen: standardsituationen || undefined,
        staerken: staerken || undefined,
        schwaechen: schwaechen || undefined,
        schluesselspielerIds: schluesselspieler.map((p) => p.id),
        media,
      });
      setSavedId(report.id);
    } catch (err) {
      console.error(err);
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  };

  if (savedId) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
        <p className="text-emerald-800 font-semibold">
          ✅ Team-Bericht wurde lokal gespeichert.
        </p>
        <p className="text-sm text-emerald-700">
          Er wird synchronisiert, sobald wieder eine Internetverbindung besteht.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <a
            href={`/reports/team/${savedId}`}
            className="rounded-lg bg-emerald-600 text-white px-4 py-2 font-medium"
          >
            Bericht ansehen
          </a>
          <a
            href="/reports/new-team"
            className="rounded-lg border border-emerald-600 text-emerald-700 px-4 py-2 font-medium"
          >
            Weiteren Bericht anlegen
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block font-medium text-slate-800 mb-1">Berichtsart</label>
        <div className="grid grid-cols-2 gap-2">
          {BERICHTSART_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBerichtsart(opt.value)}
              className={`rounded-lg border-2 py-2 px-2 font-medium flex items-center justify-center gap-2 ${
                berichtsart === opt.value
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <span>{opt.icon}</span>
              {BERICHTSART_LABELS[opt.value]}
            </button>
          ))}
        </div>
      </div>

      <ClubPicker
        label={berichtsart === "gegner_analyse" ? "Gegner-Verein" : "Eigener Verein"}
        value={clubId}
        onChange={(id) => setClubId(id)}
      />

      <BezugstypSelector
        bezugstyp={bezugstyp}
        matchId={matchId}
        onBezugstypChange={setBezugstyp}
        onMatchChange={setMatchId}
      />

      <div>
        <label className="block font-medium text-slate-800 mb-1">Datum</label>
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-800 mb-1">Formation</label>
        <input
          type="text"
          placeholder="z. B. 4-4-2"
          value={formation}
          onChange={(e) => setFormation(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-800 mb-1">Spielstil</label>
        <textarea
          value={spielstil}
          onChange={(e) => setSpielstil(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-800 mb-1">
          Standardsituationen
        </label>
        <textarea
          value={standardsituationen}
          onChange={(e) => setStandardsituationen(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-800 mb-1">Stärken</label>
        <textarea
          value={staerken}
          onChange={(e) => setStaerken(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block font-medium text-slate-800 mb-1">Schwächen</label>
        <textarea
          value={schwaechen}
          onChange={(e) => setSchwaechen(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-800 mb-1">
          Schlüsselspieler
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {schluesselspieler.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm"
            >
              {p.vorname} {p.nachname}
              <button
                type="button"
                onClick={() =>
                  setSchluesselspieler((prev) => prev.filter((x) => x.id !== p.id))
                }
                aria-label="Entfernen"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        {addingKeyPlayer ? (
          <PlayerPicker
            value=""
            onChange={(_id, player) => {
              if (player && !schluesselspieler.some((p) => p.id === player.id)) {
                setSchluesselspieler((prev) => [...prev, player]);
              }
              setAddingKeyPlayer(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="text-sm text-emerald-700 underline"
            onClick={() => setAddingKeyPlayer(true)}
          >
            + Schlüsselspieler hinzufügen
          </button>
        )}
      </div>

      <div>
        <label className="block font-medium text-slate-800 mb-1">Fotos</label>
        <CameraCapture
          photos={photos}
          onAdd={(p) => setPhotos((prev) => [...prev, p])}
          onRemove={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-emerald-600 text-white py-3 font-semibold disabled:opacity-50"
      >
        {saving ? "Speichere…" : "Bericht speichern"}
      </button>
    </form>
  );
}
