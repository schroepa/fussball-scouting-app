import { useEffect, useState, type FormEvent } from "react";
import CameraCapture, { type CapturedPhoto } from "./CameraCapture";
import ClubPicker from "./ClubPicker";
import PlayerPicker from "./PlayerPicker";
import BezugstypSelector from "./BezugstypSelector";
import RatingSlider from "./RatingSlider";
import {
  createTeamReport,
  listAttributeDefinitions,
  saveMediaBlob,
} from "../lib/local/repository";
import type {
  AttributeDefinition,
  Berichtsart,
  Bezugstyp,
  MediaRef,
  Player,
  RatingValue,
} from "../lib/types";
import { BERICHTSART_LABELS } from "../lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const BERICHTSART_OPTIONS: Berichtsart[] = ["gegner_analyse", "eigenes_team"];

export default function TeamReportForm() {
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [berichtsart, setBerichtsart] = useState<Berichtsart>("gegner_analyse");
  const [clubId, setClubId] = useState<string>("");
  const [bezugstyp, setBezugstyp] = useState<Bezugstyp>("spiel");
  const [matchId, setMatchId] = useState<string>("");
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [formation, setFormation] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
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

  useEffect(() => {
    void listAttributeDefinitions("team").then(setAttributes);
  }, []);

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

      const ratingValues: RatingValue[] = Object.entries(ratings).map(
        ([attributeKey, value]) => ({ attributeKey, value })
      );

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
        ratings: ratingValues,
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
      <Card className="max-w-xl mx-auto text-center">
        <CardHeader>
          <CardTitle>Team-Bericht gespeichert</CardTitle>
          <CardDescription>
            Lokal gespeichert – Sync sobald wieder Netz da ist.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 justify-center pb-6">
          <Button render={<a href={`/reports/team/${savedId}`} />}>
            Bericht ansehen
          </Button>
          <Button variant="outline" render={<a href="/reports/new-team" />}>
            Weiteren Bericht anlegen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      <div className="md:hidden">
        <h2 className="text-xl font-semibold tracking-tight">Teambericht</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gegner oder eigenes Team – kompakt am Platz.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        <div className="lg:col-span-5 space-y-4">
          <Card size="sm" className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Kontext</CardTitle>
              <CardDescription>Art, Verein und Bezug</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label>Berichtsart</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BERICHTSART_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setBerichtsart(opt)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                        berichtsart === opt
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      {BERICHTSART_LABELS[opt]}
                    </button>
                  ))}
                </div>
              </div>

              <ClubPicker
                label={
                  berichtsart === "gegner_analyse"
                    ? "Gegner-Verein"
                    : "Eigener Verein"
                }
                value={clubId}
                onChange={(id) => setClubId(id)}
              />

              <BezugstypSelector
                bezugstyp={bezugstyp}
                matchId={matchId}
                onBezugstypChange={setBezugstyp}
                onMatchChange={setMatchId}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tr-datum">Datum</Label>
                  <Input
                    id="tr-datum"
                    type="date"
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tr-formation">Formation (Kurznotiz)</Label>
                  <Input
                    id="tr-formation"
                    type="text"
                    placeholder="optional – Details am Spiel"
                    value={formation}
                    onChange={(e) => setFormation(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Heim/Gast × off/def und Phasen pflegst du am ausgewählten
                    Spiel unter „Formationen & Phasen“.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Schlüsselspieler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-wrap gap-2 min-h-[1.5rem]">
                {schluesselspieler.map((p) => (
                  <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
                    {p.vorname} {p.nachname}
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-muted"
                      onClick={() =>
                        setSchluesselspieler((prev) =>
                          prev.filter((x) => x.id !== p.id)
                        )
                      }
                      aria-label="Entfernen"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {addingKeyPlayer ? (
                <PlayerPicker
                  value=""
                  onChange={(_id, player) => {
                    if (
                      player &&
                      !schluesselspieler.some((p) => p.id === player.id)
                    ) {
                      setSchluesselspieler((prev) => [...prev, player]);
                    }
                    setAddingKeyPlayer(false);
                  }}
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingKeyPlayer(true)}
                >
                  + Schlüsselspieler
                </Button>
              )}
            </CardContent>
          </Card>

          <Card size="sm" className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Fotos</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <CameraCapture
                photos={photos}
                onAdd={(p) => setPhotos((prev) => [...prev, p])}
                onRemove={(id) =>
                  setPhotos((prev) => prev.filter((p) => p.id !== id))
                }
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-4">
          {attributes.length > 0 ? (
            <Card size="sm" className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle>Bewertungsraster</CardTitle>
                <CardDescription>
                  1–10 · eigene Felder unter{" "}
                  <a
                    href="/einstellungen/attribute"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Bewertungsfelder → Team
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  {attributes.map((attr) => (
                    <RatingSlider
                      key={attr.id}
                      label={attr.name}
                      description={attr.gruppe}
                      value={ratings[attr.key]}
                      min={attr.skalaMin}
                      max={attr.skalaMax}
                      onChange={(v) =>
                        setRatings((prev) => ({ ...prev, [attr.key]: v }))
                      }
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card size="sm" className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Analyse</CardTitle>
              <CardDescription>
                Spielstil und Standards – am Desktop mit mehr Schreibfläche
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="tr-stil">Spielstil</Label>
                <Textarea
                  id="tr-stil"
                  value={spielstil}
                  onChange={(e) => setSpielstil(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-standards">Standardsituationen</Label>
                <Textarea
                  id="tr-standards"
                  value={standardsituationen}
                  onChange={(e) => setStandardsituationen(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tr-staerken">Stärken</Label>
                  <Textarea
                    id="tr-staerken"
                    value={staerken}
                    onChange={(e) => setStaerken(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tr-schwaechen">Schwächen</Label>
                  <Textarea
                    id="tr-schwaechen"
                    value={schwaechen}
                    onChange={(e) => setSchwaechen(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="sticky bottom-[5.25rem] md:bottom-0 z-10 -mx-4 px-4 py-3 md:mx-0 md:px-0 bg-background/95 backdrop-blur border-t border-border md:border-0 md:bg-transparent md:backdrop-blur-none md:static md:pt-0">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            render={<a href="/reports" />}
          >
            Abbrechen
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto sm:min-w-[12rem]"
            size="lg"
          >
            {saving ? "Speichere…" : "Bericht speichern"}
          </Button>
        </div>
      </div>
    </form>
  );
}
