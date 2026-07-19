import { useEffect, useState, type FormEvent } from "react";
import ClubPicker from "./ClubPicker";
import { createPlayer } from "../lib/local/repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
          <p className="text-sm text-primary">Spieler wurde angelegt.</p>
        )}
        <Button type="button" onClick={() => setOpen(true)} className="w-full sm:w-auto">
          + Spieler manuell anlegen
        </Button>
      </div>
    );
  }

  return (
    <Card size="sm" className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>Neuer Spieler</CardTitle>
        <CardDescription>Manuell anlegen, wenn kein Import passt</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cp-vorname">Vorname</Label>
              <Input
                id="cp-vorname"
                value={vorname}
                onChange={(e) => setVorname(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-nachname">Nachname</Label>
              <Input
                id="cp-nachname"
                value={nachname}
                onChange={(e) => setNachname(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-pos">Position</Label>
              <Input
                id="cp-pos"
                placeholder="optional"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-dob">Geburtsdatum</Label>
              <Input
                id="cp-dob"
                type="date"
                value={geburtsdatum}
                onChange={(e) => setGeburtsdatum(e.target.value)}
              />
            </div>
          </div>
          <ClubPicker
            label="Verein (optional)"
            value={clubId}
            onChange={(id) => setClubId(id || undefined)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Speichere…" : "Spieler speichern"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
