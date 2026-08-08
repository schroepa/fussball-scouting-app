import type { AppMode, AppRole, Scout } from "../types";

const MODE_KEY = "fusca_app_mode";
const ACTIVE_TEAM_KEY = "fusca_active_team_id";
const PROFILE_KEY = "fusca_user_profile";

export function getStoredAppMode(): AppMode | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(MODE_KEY);
  return raw === "scout" || raw === "trainer" ? raw : null;
}

export function setStoredAppMode(mode: AppMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent("fusca:mode-changed", { detail: mode }));
}

export function getActiveTeamId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_TEAM_KEY);
}

export function setActiveTeamId(teamId: string | null): void {
  if (typeof window === "undefined") return;
  if (teamId) window.localStorage.setItem(ACTIVE_TEAM_KEY, teamId);
  else window.localStorage.removeItem(ACTIVE_TEAM_KEY);
  window.dispatchEvent(
    new CustomEvent("fusca:active-team-changed", { detail: teamId })
  );
}

/** Lokales Profil-Overlay (Rollen/Trainer-Felder), bis Sync remote pflegt. */
export function getLocalProfileOverlay(): Partial<Scout> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<Scout>;
  } catch {
    return null;
  }
}

export function saveLocalProfileOverlay(patch: Partial<Scout>): Partial<Scout> {
  const prev = getLocalProfileOverlay() ?? {};
  const next = { ...prev, ...patch };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("fusca:profile-changed"));
  }
  return next;
}

export function mergeScoutWithProfile(scout: Scout): Scout {
  const overlay = getLocalProfileOverlay();
  if (!overlay) {
    return {
      ...scout,
      roles: scout.roles?.length ? scout.roles : (["scout"] as AppRole[]),
    };
  }
  return {
    ...scout,
    ...overlay,
    id: scout.id,
    email: scout.email || overlay.email || "",
    name: overlay.name || scout.name,
    roles:
      overlay.roles?.length || scout.roles?.length
        ? ([...(overlay.roles ?? scout.roles ?? ["scout"])] as AppRole[])
        : (["scout"] as AppRole[]),
  };
}

export function resolveAppMode(scout: Scout): AppMode {
  const roles = scout.roles?.length ? scout.roles : (["scout"] as AppRole[]);
  const stored = getStoredAppMode();
  if (stored && roles.includes(stored)) return stored;
  if (scout.primaryMode && roles.includes(scout.primaryMode)) {
    return scout.primaryMode;
  }
  if (roles.includes("trainer") && !roles.includes("scout")) return "trainer";
  return "scout";
}

export function hasRole(scout: Scout, role: AppRole): boolean {
  const roles = scout.roles?.length ? scout.roles : (["scout"] as AppRole[]);
  return roles.includes(role);
}

export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) {
    code += alphabet[b % alphabet.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
