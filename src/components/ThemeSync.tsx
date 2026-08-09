import { useEffect } from "react";
import { bindSystemThemeListener } from "@/lib/theme";

/** Keeps appearance synced with OS when preference is „system“. */
export default function ThemeSync() {
  useEffect(() => bindSystemThemeListener(), []);
  return null;
}
