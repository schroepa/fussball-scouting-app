import { useEffect, useState, type FormEvent } from "react";
import RatingSlider from "./RatingSlider";
import CameraCapture, { type CapturedPhoto } from "./CameraCapture";
import PlayerPicker from "./PlayerPicker";
import BezugstypSelector from "./BezugstypSelector";
import { db, ensureSeeded } from "../lib/local/db";
import { createPlayerReport, saveMediaBlob } from "../lib/local/repository";
import type {
  AttributeDefinition,
  Bezugstyp,
  Empfehlung,
  MediaRef,
  RatingValue,
} from "../lib/types";
import { EMPFEHLUNG_LABELS } from "../lib/types";

const EMPFEHLUNG_OPTIONS: Empfehlung[] = [
  "unbedingt_beobachten",
  "im_blick_behalten",
  "kein_potenzial",
];

export default function PlayerReportForm() {
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [playerId, setPlayerId] = useState<string>("");
  const [bezugstyp, setBezugstyp] = useState<Bezugstyp>("spiel");
  const [matchId, setMatchId] = useState<string>("");
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [positionBeobachtet, setPositionBeobachtet] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [gesamtbewertung, setGesamtbewertung] = useState<number | undefined>();
  const [staerken, setStaerken] = useState("");
  const [schwaechen, setSchwaechen] = useState("");
  const [freitext, setFreitext] = useState("");
  const [empfehlung, setEmpfehlung] = useState<Empfehlung | "">("");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await ensureSeeded();
      const defs = await db.attributeDefinitions
        .where("giltFuer")
        .equals("player")
        .sortBy("reihenfolge");
      setAttributes(defs);
    })();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!playerId) {
      setError("Bitte einen Spieler auswählen oder anlegen.");
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

      const ratingValues: RatingValue[] = Object.entries(ratings).map(
        ([attributeKey, value]) => ({ attributeKey, value })
      );

      // Vorerst lokaler Fallback-Scout, bis Login (M0 Auth) im Browser
      // aktiv genutzt wird – siehe src/lib/auth/session.ts.
      const { getCurrentSession } = await import("../lib/auth/session");
      const session = await getCurrentSession();

      const report = await createPlayerReport({
        playerId,
        scoutId: session.scout.id,
        bezugstyp,
        matchId: bezugstyp === "spiel" ? matchId : undefined,
        datum: new Date(datum).toISOString(),
        positionBeobachtet: positionBeobachtet || undefined,
        ratings: ratingValues,
        gesamtbewertung,
        staerken: staerken || undefined,
        schwaechen: schwaechen || undefined,
        freitextNotizen: freitext || undefined,
        empfehlung: empfehlung || undefined,
        tags: [],
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
          ✅ Bericht wurde lokal gespeichert.
        </p>
        <p className="text-sm text-emerald-700">
          Er wird synchronisiert, sobald wieder eine Internetverbindung besteht.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <a
            href={`/reports/player/${savedId}`}
            className="rounded-lg bg-emerald-600 text-white px-4 py-2 font-medium"
          >
            Bericht ansehen
          </a>
          <a
            href="/reports/new-player"
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
      <PlayerPicker
        value={playerId}
        onChange={(id) => setPlayerId(id)}
      />

      <BezugstypSelector
        bezugstyp={bezugstyp}
        matchId={matchId}
        onBezugstypChange={setBezugstyp}
        onMatchChange={setMatchId}
      />

      <div className="grid grid-cols-2 gap-3">
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
          <label className="block font-medium text-slate-800 mb-1">
            Beobachtete Position
          </label>
          <input
            type="text"
            placeholder="z. B. Linksaußen"
            value={positionBeobachtet}
            onChange={(e) => setPositionBeobachtet(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-800 mb-2">Bewertungsraster</h3>
        {attributes.map((attr) => (
          <RatingSlider
            key={attr.id}
            label={attr.name}
            description={attr.gruppe}
            value={ratings[attr.key]}
            min={attr.skalaMin}
            max={attr.skalaMax}
            onChange={(v) => setRatings((prev) => ({ ...prev, [attr.key]: v }))}
          />
        ))}
        <div className="mt-2 pt-2 border-t border-slate-100">
          <RatingSlider
            label="Gesamtbewertung"
            description="Manuell – nicht automatisch aus den Einzelwerten berechnet."
            value={gesamtbewertung}
            onChange={setGesamtbewertung}
          />
        </div>
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
          Weitere Notizen
        </label>
        <textarea
          value={freitext}
          onChange={(e) => setFreitext(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-800 mb-1">Empfehlung</label>
        <div className="grid grid-cols-1 gap-2">
          {EMPFEHLUNG_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setEmpfehlung(opt)}
              className={`rounded-lg border-2 py-2 px-3 text-left font-medium ${
                empfehlung === opt
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {EMPFEHLUNG_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-medium text-slate-800 mb-1">Fotos</label>
        <CameraCapture
          photos={photos}
          onAdd={(p) => setPhotos((prev) => [...prev, p])}
          onRemove={(id) =>
            setPhotos((prev) => prev.filter((p) => p.id !== id))
          }
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
