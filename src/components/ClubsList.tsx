import { useEffect, useState } from "react";
import { listClubs } from "../lib/local/repository";
import type { Club } from "../lib/types";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ClubsList() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = () => {
      void listClubs().then(setClubs);
    };
    load();
    window.addEventListener("scouting:synced", load);
    return () => window.removeEventListener("scouting:synced", load);
  }, []);

  const filtered = clubs.filter((c) =>
    query.trim() ? c.name.toLowerCase().includes(query.toLowerCase()) : true
  );

  return (
    <div className="space-y-4">
      <Input
        type="search"
        placeholder="Verein suchen…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-md"
      />
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Noch keine Vereine angelegt. Lege beim Anlegen eines Berichts einen neuen
          Verein an.
        </p>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {filtered.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-2"
              >
                <div className="font-semibold truncate">{c.name}</div>
                {c.liga && (
                  <span className="text-sm text-muted-foreground shrink-0">
                    {c.liga}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="hidden md:block rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Verein</TableHead>
                  <TableHead>Liga</TableHead>
                  <TableHead>Land</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.liga ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.land ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
