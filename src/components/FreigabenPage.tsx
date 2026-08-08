import { useEffect, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { listPlayers } from "../lib/local/repository";
import {
  acceptShareByCode,
  createPlayerShare,
  listIncomingShares,
  listOutgoingShares,
  listSquadMemberships,
  revokeShare,
} from "../lib/local/trainerRepository";
import type { Player, PlayerShare, ShareRole } from "../lib/types";
import {
  SHARE_ROLE_LABELS,
  SHARE_STATUS_LABELS,
} from "../lib/types";

export default function FreigabenPage() {
  const [outgoing, setOutgoing] = useState<PlayerShare[]>([]);
  const [incoming, setIncoming] = useState<PlayerShare[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [consentByPlayer, setConsentByPlayer] = useState<Map<string, string>>(
    new Map()
  );
  const [playerId, setPlayerId] = useState("");
  const [role, setRole] = useState<ShareRole>("contributor");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const reload = async () => {
    const [out, inc, pl, memberships] = await Promise.all([
      listOutgoingShares(),
      listIncomingShares(),
      listPlayers(),
      listSquadMemberships(),
    ]);
    setOutgoing(out);
    setIncoming(inc);
    setPlayers(pl);
    const map = new Map<string, string>();
    for (const m of memberships) {
      // wenn mehrere Teams: erteilt gewinnt für Freigabe-Check-Anzeige
      const prev = map.get(m.playerId);
      if (prev === "erteilt") continue;
      map.set(m.playerId, m.consentStatus);
    }
    setConsentByPlayer(map);
  };

  useEffect(() => {
    void reload();
    const onSynced = () => void reload();
    window.addEventListener("scouting:synced", onSynced);
    return () => window.removeEventListener("scouting:synced", onSynced);
  }, []);

  const playerName = (id: string) => {
    const p = players.find((x) => x.id === id);
    return p ? `${p.nachname}, ${p.vorname}` : id.slice(0, 8);
  };

  const shareablePlayers = players.filter((p) => {
    const consent = consentByPlayer.get(p.id);
    return !consent || consent === "erteilt";
  });

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setCreatedCode(null);
    if (!playerId) {
      setError("Spieler wählen.");
      return;
    }
    try {
      const share = await createPlayerShare({ playerId, role });
      setCreatedCode(share.inviteCode);
      setMessage("Einladung erstellt. Code teilen – kein öffentlicher Marktplatz.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Freigabe fehlgeschlagen.");
    }
  };

  const handleAccept = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await acceptShareByCode(inviteCode);
      setInviteCode("");
      setMessage("Freigabe angenommen.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Annahme fehlgeschlagen.");
    }
  };

  return (
    <div id="page-freigaben" className="space-y-8">
      <section id="section-share-create" className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Freigabe erstellen</h2>
        <p className="text-sm text-muted-foreground">
          Gezielte Einladung per Code. Stammdaten (Name/Foto) werden standardmäßig
          nicht mitgeteilt. Freigabe nur bei erteilter Einwilligung.
        </p>
        <form
          id="form-create-share"
          onSubmit={handleCreate}
          className="grid gap-3 sm:grid-cols-3 rounded-lg border border-border bg-card p-4"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Spieler</Label>
            <SimpleSelect
              value={playerId}
              onValueChange={setPlayerId}
              placeholder="Spieler wählen"
              options={shareablePlayers.map((p) => ({
                value: p.id,
                label: `${p.nachname}, ${p.vorname}`,
              }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rolle</Label>
            <SimpleSelect
              value={role}
              onValueChange={(v) => setRole(v as ShareRole)}
              options={[
                { value: "contributor", label: SHARE_ROLE_LABELS.contributor },
                { value: "viewer", label: SHARE_ROLE_LABELS.viewer },
              ]}
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit">Einladungscode erzeugen</Button>
          </div>
        </form>
        {createdCode ? (
          <p className="rounded-lg bg-muted px-3 py-2 font-mono text-sm" role="status">
            Code: <strong>{createdCode}</strong>
          </p>
        ) : null}
      </section>

      <section id="section-share-accept" className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Einladung annehmen</h2>
        <form
          id="form-accept-share"
          onSubmit={handleAccept}
          className="flex flex-col sm:flex-row gap-2 rounded-lg border border-border bg-card p-4"
        >
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            className="font-mono sm:max-w-xs"
            aria-label="Einladungscode"
          />
          <Button type="submit">Annehmen</Button>
        </form>
      </section>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-primary" role="status">
          {message}
        </p>
      ) : null}

      <section id="section-share-outgoing" className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Ausgehende Freigaben</h2>
        {outgoing.length === 0 ? (
          <EmptyState title="Noch keine Freigaben" description="Erstelle einen Code für einen Spieler." />
        ) : (
          <ul className="space-y-2">
            {outgoing.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-card px-3 py-3"
              >
                <div>
                  <div className="font-medium">{playerName(s.playerId)}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {s.inviteCode} · {SHARE_ROLE_LABELS[s.role]}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{SHARE_STATUS_LABELS[s.status]}</Badge>
                  {(s.status === "pending" || s.status === "active") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await revokeShare(s.id);
                        await reload();
                      }}
                    >
                      Widerrufen
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="section-share-incoming" className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Eingehende Freigaben</h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine angenommenen Freigaben.</p>
        ) : (
          <ul className="space-y-2">
            {incoming.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-3"
              >
                <div>
                  <div className="font-medium">Spieler {s.playerId.slice(0, 8)}…</div>
                  <div className="text-xs text-muted-foreground">
                    {SHARE_ROLE_LABELS[s.role]} · ohne Stammdaten
                    {!s.sharePii ? "" : " (PII freigegeben)"}
                  </div>
                </div>
                <Badge variant="secondary">{SHARE_STATUS_LABELS[s.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
