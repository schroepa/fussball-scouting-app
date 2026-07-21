import { useEffect, useState, type FormEvent } from "react";
import { isSupabaseConfigured } from "../lib/supabase/client";
import {
  getCurrentSession,
  signInWithGoogle,
  signInWithMagicLink,
} from "../lib/auth/session";
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
import { Separator } from "@/components/ui/separator";

function getNextPath(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setChecking(false);
      return;
    }
    getCurrentSession().then((session) => {
      if (session.isAuthenticated) {
        window.location.replace(getNextPath());
        return;
      }
      setChecking(false);
    });
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <Card size="sm" className="border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 shadow-sm">
        <CardHeader>
          <CardTitle>Supabase ist noch nicht konfiguriert</CardTitle>
          <CardDescription className="text-amber-900/80 dark:text-amber-100/80">
            Trage{" "}
            <code className="rounded bg-amber-500/20 px-1">PUBLIC_SUPABASE_URL</code> und{" "}
            <code className="rounded bg-amber-500/20 px-1">PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            in der lokalen <code className="rounded bg-amber-500/20 px-1">.env</code> ein
            (siehe README), dann Dev-Server neu starten.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (checking) {
    return (
      <p className="text-muted-foreground text-sm text-center">Prüfe Anmeldung…</p>
    );
  }

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithMagicLink(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card size="sm" className="shadow-sm">
      <CardHeader>
        <CardTitle>Anmelden</CardTitle>
        <CardDescription>
          Google oder Magic Link – danach lokal und mit Sync weiterarbeiten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={handleGoogle}
        >
          Mit Google anmelden
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">oder per E-Mail</span>
          <Separator className="flex-1" />
        </div>

        {sent ? (
          <p className="text-sm text-primary text-center">
            Link zum Einloggen wurde an <strong>{email}</strong> geschickt. Bitte
            Postfach prüfen.
          </p>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">E-Mail</Label>
              <Input
                id="login-email"
                type="email"
                required
                placeholder="deine@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? "Sende Link…" : "Magic Link senden"}
            </Button>
          </form>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
