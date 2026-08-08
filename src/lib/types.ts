/**
 * Zentrale Domänen-Typen der Scouting-App.
 * Diese Typen bilden sowohl die lokale (Dexie/IndexedDB) als auch die
 * zentrale (Supabase/Postgres) Datenhaltung ab. Siehe docs/PLANNING.md.
 */

export type SyncStatus = "pending" | "synced" | "error";

export type Bezugstyp = "spiel" | "training" | "sonstige_beobachtung";

export type Berichtsart = "gegner_analyse" | "eigenes_team";

export type Empfehlung =
  | "unbedingt_beobachten"
  | "im_blick_behalten"
  | "kein_potenzial";

export const BEZUGSTYP_LABELS: Record<Bezugstyp, string> = {
  spiel: "Spiel",
  training: "Training",
  sonstige_beobachtung: "Sonstige Beobachtung",
};

export const BERICHTSART_LABELS: Record<Berichtsart, string> = {
  gegner_analyse: "Gegner-Analyse",
  eigenes_team: "Eigenes Team",
};

export const EMPFEHLUNG_LABELS: Record<Empfehlung, string> = {
  unbedingt_beobachten: "Unbedingt beobachten",
  im_blick_behalten: "Im Blick behalten",
  kein_potenzial: "Kein Potenzial",
};

/** Ein Verein/Club, manuell angelegt oder importiert (external_ref gesetzt). */
export interface Club {
  id: string;
  name: string;
  land: string;
  liga?: string;
  logoUrl?: string;
  externalSource?: string;
  externalRef?: string;
  /** Scout, dem dieser Verein gehört (Datentrennung). */
  ownerScoutId?: string;
  customFields?: Record<string, unknown>;
  syncStatus: SyncStatus;
  updatedAt: string;
  createdAt: string;
}

/** Ein Spieler, manuell angelegt oder importiert. */
export interface Player {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum?: string;
  /** Jahrgang (Jugend) – datensparsame Alternative zum vollen Geburtsdatum. */
  jahrgang?: number;
  nationalitaet?: string;
  positionen: string[];
  starkerFuss?: "links" | "rechts" | "beidfuessig";
  groesseCm?: number;
  aktuellerClubId?: string;
  fotoUrl?: string;
  fotoBlob?: Blob;
  externalSource?: string;
  externalRef?: string;
  /** Scout, dem dieser Spieler gehört (Datentrennung). */
  ownerScoutId?: string;
  customFields?: Record<string, unknown>;
  syncStatus: SyncStatus;
  updatedAt: string;
  createdAt: string;
}

/** Spielphase mit Formationen ab einer Minute (M7). */
export interface MatchPhase {
  id: string;
  abMinute: number;
  formationHeimOff?: string;
  formationHeimDef?: string;
  formationGastOff?: string;
  formationGastDef?: string;
  notiz?: string;
}

/** Zeitmarke für Video-/VEO-Studium (M8). */
export interface MatchVideoMarker {
  id: string;
  /** Spielminute (optional). */
  abMinute?: number;
  /** Freier Timecode, z. B. 00:12:34 oder VEO-Marker. */
  timecode?: string;
  label?: string;
  notiz?: string;
}

/** Ein Spiel (optional als Bezug für Berichte). */
export interface Match {
  id: string;
  heimClubId?: string;
  heimClubName: string;
  gastClubId?: string;
  gastClubName: string;
  wettbewerb?: string;
  datum: string;
  spielort?: string;
  /** Basis-Formation Heim offensiv (z. B. 4-3-3). */
  formationHeimOff?: string;
  formationHeimDef?: string;
  formationGastOff?: string;
  formationGastDef?: string;
  /** Systemwechsel / Phasen chronologisch nach abMinute. */
  phases?: MatchPhase[];
  /** Externer Video-Link (VEO o. Ä.) – kein Rohvideo-Upload. */
  videoUrl?: string;
  /** Kurzbezeichnung / VEO-Referenz. */
  videoRef?: string;
  /** Zeitmarken / Szenen für Video-Studium. */
  videoMarkers?: MatchVideoMarker[];
  externalSource?: string;
  externalRef?: string;
  /** Scout, dem dieses Spiel gehört (Datentrennung). */
  ownerScoutId?: string;
  syncStatus: SyncStatus;
  updatedAt: string;
  createdAt: string;
}

export interface RatingValue {
  attributeKey: string;
  value: number;
}

export interface MediaRef {
  id: string;
  typ: "foto" | "video" | "video_link";
  localBlobKey?: string;
  url?: string;
  syncStatus: SyncStatus;
}

/** Spieler-Scouting-Bericht. */
export interface PlayerReport {
  id: string;
  playerId: string;
  scoutId: string;
  bezugstyp: Bezugstyp;
  matchId?: string;
  datum: string;
  positionBeobachtet?: string;
  ratings: RatingValue[];
  gesamtbewertung?: number;
  staerken?: string;
  schwaechen?: string;
  freitextNotizen?: string;
  empfehlung?: Empfehlung;
  tags: string[];
  media: MediaRef[];
  customFields?: Record<string, unknown>;
  syncStatus: SyncStatus;
  updatedAt: string;
  createdAt: string;
}

/** Team-Bericht: Gegner-Analyse ODER Analyse des eigenen/beobachteten Teams. */
export interface TeamReport {
  id: string;
  clubId: string;
  scoutId: string;
  berichtsart: Berichtsart;
  bezugstyp: Bezugstyp;
  matchId?: string;
  datum: string;
  formation?: string;
  spielstil?: string;
  standardsituationen?: string;
  staerken?: string;
  schwaechen?: string;
  schluesselspielerIds: string[];
  /** Optionales Team-Bewertungsraster (Skalen), analog zu Spielerberichten. */
  ratings?: RatingValue[];
  media: MediaRef[];
  customFields?: Record<string, unknown>;
  syncStatus: SyncStatus;
  updatedAt: string;
  createdAt: string;
}

export type AttributeAppliesTo = "player" | "team";
export type AttributeType = "skala" | "text" | "auswahl";

/** Erweiterbare Bewertungs-/Feld-Definition (Grundlage für M6). */
export interface AttributeDefinition {
  id: string;
  giltFuer: AttributeAppliesTo;
  key: string;
  name: string;
  typ: AttributeType;
  skalaMin?: number;
  skalaMax?: number;
  auswahlOptionen?: string[];
  gruppe?: string;
  istCustom: boolean;
  reihenfolge: number;
  /** Nur bei eigenen Custom-Feldern (Datentrennung). */
  ownerScoutId?: string;
  syncStatus?: SyncStatus;
  updatedAt?: string;
  createdAt?: string;
}

export type AppRole = "scout" | "trainer";
export type AppMode = "scout" | "trainer";

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  scout: "Scout",
  trainer: "Trainer",
};

export const AGE_GROUP_OPTIONS = [
  "U8",
  "U9",
  "U10",
  "U11",
  "U12",
  "U13",
  "U14",
  "U15",
  "U16",
  "U17",
  "U18",
  "U19",
  "U21",
  "Herren",
  "Damen",
] as const;

export interface Scout {
  id: string;
  name: string;
  email: string;
  authProvider?: string;
  /** Mehrfachauswahl – Nutzer können Scout und Trainer sein. */
  roles?: AppRole[];
  /** Bevorzugte Startansicht bei Doppelrolle. */
  primaryMode?: AppMode;
  /** Verein/Team-Angabe bei Trainer-Rolle (Selbstauskunft). */
  trainerClubName?: string;
  trainerAgeGroups?: string[];
  syncStatus?: SyncStatus;
  updatedAt?: string;
}

/** Mannschaft eines Trainers (mehrere Teams parallel möglich). */
export interface Team {
  id: string;
  name: string;
  clubId?: string;
  clubName: string;
  ageGroup: string;
  season?: string;
  ownerScoutId: string;
  syncStatus: SyncStatus;
  updatedAt: string;
  createdAt: string;
}

export type ConsentStatus = "ausstehend" | "erteilt" | "verweigert";

export const CONSENT_STATUS_LABELS: Record<ConsentStatus, string> = {
  ausstehend: "Ausstehend",
  erteilt: "Erteilt",
  verweigert: "Verweigert",
};

/** Kadereintrag: Spieler ↔ Team inkl. Eltern-Einwilligung. */
export interface SquadMembership {
  id: string;
  teamId: string;
  playerId: string;
  consentStatus: ConsentStatus;
  jerseyNumber?: number;
  notes?: string;
  ownerScoutId: string;
  syncStatus: SyncStatus;
  updatedAt: string;
  createdAt: string;
}

export type ShareRole = "contributor" | "viewer";
export type ShareStatus = "pending" | "active" | "revoked" | "expired";

export const SHARE_ROLE_LABELS: Record<ShareRole, string> = {
  contributor: "Mitbewerten",
  viewer: "Nur lesen",
};

export const SHARE_STATUS_LABELS: Record<ShareStatus, string> = {
  pending: "Offen",
  active: "Aktiv",
  revoked: "Widerrufen",
  expired: "Abgelaufen",
};

/**
 * Gezielte Freigabe eines Spielerprofils (Einladung per Code).
 * Kein Marktplatz – Zugriff nur nach Annahme des Codes.
 */
export interface PlayerShare {
  id: string;
  playerId: string;
  ownerScoutId: string;
  inviteCode: string;
  inviteExpiresAt: string;
  acceptedByScoutId?: string;
  role: ShareRole;
  status: ShareStatus;
  /** Sensible Stammdaten mitteilen? Standard false. */
  sharePii: boolean;
  revokedAt?: string;
  acceptedAt?: string;
  syncStatus: SyncStatus;
  updatedAt: string;
  createdAt: string;
}

export interface FormationPlayerPos {
  playerId: string;
  positionLabel?: string;
  /** Relativ 0–100 auf dem Spielfeld (Breite). */
  x: number;
  /** Relativ 0–100 auf dem Spielfeld (Tiefe, 0 = eigene Grundlinie). */
  y: number;
}

/**
 * Taktik-/Aufstellungsboard (V1: Positions-Sets offensiv/defensiv, ohne Zeichenebene).
 */
export interface TacticalFormation {
  id: string;
  name: string;
  teamId?: string;
  /** Optional – lose Kopplung an ein Spiel; V1 oft null (Vorlage). */
  gameId?: string;
  templateKey?: string;
  positionsOff: FormationPlayerPos[];
  positionsDef: FormationPlayerPos[];
  ownerScoutId: string;
  syncStatus: SyncStatus;
  updatedAt: string;
  createdAt: string;
}
