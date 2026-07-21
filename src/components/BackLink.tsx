import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackLinkProps {
  href: string;
  label: string;
  className?: string;
}

/** Einfacher Zurück-Link oberhalb von Unterseiten-Titeln. */
export default function BackLink({ href, label, className }: BackLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2",
        className
      )}
    >
      <ArrowLeft className="size-3.5 shrink-0" aria-hidden="true" />
      {label}
    </a>
  );
}
