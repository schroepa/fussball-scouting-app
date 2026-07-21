import { useEffect, useState, type FormEvent } from "react";
import {
  createCustomAttribute,
  deleteCustomAttribute,
  listAttributeDefinitions,
  updateCustomAttribute,
} from "@/lib/local/repository";
import type { AttributeAppliesTo, AttributeDefinition } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2 } from "lucide-react";

export default function AttributeManager() {
  const [scope, setScope] = useState<AttributeAppliesTo>("player");
  const [defs, setDefs] = useState<AttributeDefinition[]>([]);
  const [name, setName] = useState("");
  const [gruppe, setGruppe] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async (giltFuer: AttributeAppliesTo = scope) => {
    setDefs(await listAttributeDefinitions(giltFuer));
  };

  useEffect(() => {
    void reload(scope);
    const onSynced = () => {
      void reload(scope);
    };
    window.addEventListener("scouting:synced", onSynced);
    return () => window.removeEventListener("scouting:synced", onSynced);
  }, [scope]);

  const defaults = defs.filter((d) => !d.istCustom);
  const customs = defs.filter((d) => d.istCustom);
  const scopeLabel = scope === "player" ? "Spielerbericht" : "Teambericht";

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!name.trim()) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    setSaving(true);
    try {
      await createCustomAttribute({
        name: name.trim(),
        gruppe: gruppe.trim() || undefined,
        giltFuer: scope,
      });
      setName("");
      setGruppe("");
      setMessage(`Feld angelegt – erscheint im ${scopeLabel}.`);
      await reload();
      window.dispatchEvent(new Event("scouting:synced"));
    } catch (err) {
      console.error(err);
      setError("Anlegen fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (def: AttributeDefinition, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === def.name) return;
    await updateCustomAttribute(def.id, { name: trimmed });
    await reload();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Dieses Custom-Feld wirklich löschen?")) return;
    await deleteCustomAttribute(id);
    await reload();
  };

  const onTabChange = (value: string | number | null) => {
    if (value !== "player" && value !== "team") return;
    setScope(value);
    setError(null);
    setMessage(null);
    setName("");
    setGruppe("");
  };

  const panels = (
    <div className="space-y-6">
      <Card size="sm" className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle>Eigenes Bewertungsfeld</CardTitle>
          <CardDescription>
            {scope === "player"
              ? "Ergänzt Technik, Taktik, Athletik, Mentalität im Spielerbericht."
              : "Ergänzt Organisation, Pressing, Umschalten, Standards im Teambericht."}{" "}
            Skala 1–10. Nur für dich sichtbar.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="attr-name">Name</Label>
                <Input
                  id="attr-name"
                  placeholder={
                    scope === "player"
                      ? "z. B. Kopfballspiel"
                      : "z. B. Ballbesitz"
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="attr-gruppe">Beschreibung (optional)</Label>
                <Input
                  id="attr-gruppe"
                  placeholder="Kurzer Hinweis unter dem Slider"
                  value={gruppe}
                  onChange={(e) => setGruppe(e.target.value)}
                />
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-primary">{message}</p> : null}
            <Button type="submit" disabled={saving}>
              {saving ? "Anlegen…" : "Feld anlegen"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card size="sm" className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle>Standard-Raster</CardTitle>
          <CardDescription>Fest vorgegeben, nicht löschbar.</CardDescription>
        </CardHeader>
        <CardContent className="pt-3 space-y-1.5">
          {defaults.map((d) => (
            <div
              key={d.id}
              className="surface-nested-inner flex items-center justify-between gap-2 border border-border px-3 py-2"
            >
              <div>
                <div className="font-medium text-sm">{d.name}</div>
                {d.gruppe ? (
                  <div className="text-xs text-muted-foreground">{d.gruppe}</div>
                ) : null}
              </div>
              <Badge variant="secondary">Standard</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card size="sm" className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle>Deine Felder</CardTitle>
          <CardDescription>
            {customs.length === 0
              ? "Noch keine eigenen Felder."
              : `${customs.length} Custom-Feld${customs.length === 1 ? "" : "er"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3 space-y-1.5">
          {customs.map((d) => (
            <div
              key={d.id}
              className="surface-nested-inner flex flex-col sm:flex-row sm:items-center gap-2 border border-border px-3 py-2"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <Input
                  className="h-8 text-sm font-medium"
                  defaultValue={d.name}
                  onBlur={(e) => void handleRename(d, e.target.value)}
                />
                {d.gruppe ? (
                  <div className="text-xs text-muted-foreground truncate">
                    {d.gruppe}
                  </div>
                ) : null}
                <div className="text-[10px] text-muted-foreground">
                  Schlüssel: {d.key}
                  {d.syncStatus === "pending"
                    ? " · Sync ausstehend"
                    : d.syncStatus === "error"
                      ? " · Sync-Fehler"
                      : ""}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-destructive"
                onClick={() => void handleDelete(d.id)}
              >
                <Trash2 data-icon="inline-start" />
                Löschen
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <Tabs value={scope} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="player">Spieler</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>
        <TabsContent value="player" className="mt-4">
          {scope === "player" ? panels : null}
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          {scope === "team" ? panels : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
