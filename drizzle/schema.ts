import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Zentrales Datenbankschema (Supabase/Postgres) – Referenzdefinition, aus der
 * die SQL-Migration generiert wird (siehe supabase/migrations/).
 *
 * Wichtig: Row Level Security (RLS) wird bewusst NICHT über Drizzle
 * verwaltet, sondern separat in supabase/policies.sql gepflegt, damit die
 * Policies unabhängig von Migrations-Läufen im Supabase SQL-Editor
 * nachvollziehbar bleiben. Siehe docs/PLANNING.md, Abschnitt 3.
 */

export const scouts = pgTable("scouts", {
  id: uuid("id").primaryKey(), // == auth.users.id
  name: text("name").notNull(),
  email: text("email").notNull(),
  authProvider: text("auth_provider"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  land: text("land").notNull().default("Deutschland"),
  liga: text("liga"),
  logoUrl: text("logo_url"),
  externalSource: text("external_source"),
  externalRef: text("external_ref"),
  customFields: jsonb("custom_fields").notNull().default({}),
  createdBy: uuid("created_by").references(() => scouts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const players = pgTable("players", {
  id: uuid("id").primaryKey(),
  vorname: text("vorname").notNull(),
  nachname: text("nachname").notNull(),
  geburtsdatum: text("geburtsdatum"),
  nationalitaet: text("nationalitaet"),
  positionen: jsonb("positionen").notNull().default([]),
  starkerFuss: text("starker_fuss"),
  groesseCm: integer("groesse_cm"),
  aktuellerClubId: uuid("aktueller_club_id").references(() => clubs.id),
  fotoUrl: text("foto_url"),
  externalSource: text("external_source"),
  externalRef: text("external_ref"),
  customFields: jsonb("custom_fields").notNull().default({}),
  createdBy: uuid("created_by").references(() => scouts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey(),
  heimClubId: uuid("heim_club_id").references(() => clubs.id),
  heimClubName: text("heim_club_name").notNull(),
  gastClubId: uuid("gast_club_id").references(() => clubs.id),
  gastClubName: text("gast_club_name").notNull(),
  wettbewerb: text("wettbewerb"),
  datum: timestamp("datum", { withTimezone: true }).notNull(),
  spielort: text("spielort"),
  formationHeimOff: text("formation_heim_off"),
  formationHeimDef: text("formation_heim_def"),
  formationGastOff: text("formation_gast_off"),
  formationGastDef: text("formation_gast_def"),
  phases: jsonb("phases").notNull().default([]),
  externalSource: text("external_source"),
  externalRef: text("external_ref"),
  createdBy: uuid("created_by").references(() => scouts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const playerReports = pgTable("player_reports", {
  id: uuid("id").primaryKey(),
  playerId: uuid("player_id").notNull().references(() => players.id),
  scoutId: uuid("scout_id").notNull().references(() => scouts.id),
  bezugstyp: text("bezugstyp").notNull(), // spiel | training | sonstige_beobachtung
  matchId: uuid("match_id").references(() => matches.id),
  datum: timestamp("datum", { withTimezone: true }).notNull(),
  positionBeobachtet: text("position_beobachtet"),
  ratings: jsonb("ratings").notNull().default([]),
  gesamtbewertung: integer("gesamtbewertung"),
  staerken: text("staerken"),
  schwaechen: text("schwaechen"),
  freitextNotizen: text("freitext_notizen"),
  empfehlung: text("empfehlung"),
  tags: jsonb("tags").notNull().default([]),
  customFields: jsonb("custom_fields").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamReports = pgTable("team_reports", {
  id: uuid("id").primaryKey(),
  clubId: uuid("club_id").notNull().references(() => clubs.id),
  scoutId: uuid("scout_id").notNull().references(() => scouts.id),
  berichtsart: text("berichtsart").notNull(), // gegner_analyse | eigenes_team
  bezugstyp: text("bezugstyp").notNull(), // spiel | training | sonstige_beobachtung
  matchId: uuid("match_id").references(() => matches.id),
  datum: timestamp("datum", { withTimezone: true }).notNull(),
  formation: text("formation"),
  spielstil: text("spielstil"),
  standardsituationen: text("standardsituationen"),
  staerken: text("staerken"),
  schwaechen: text("schwaechen"),
  schluesselspielerIds: jsonb("schluesselspieler_ids").notNull().default([]),
  customFields: jsonb("custom_fields").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const media = pgTable("media", {
  id: uuid("id").primaryKey(),
  reportTyp: text("report_typ").notNull(), // player_report | team_report
  reportId: uuid("report_id").notNull(),
  typ: text("typ").notNull(), // foto | video | video_link
  url: text("url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attributeDefinitions = pgTable("attribute_definitions", {
  id: uuid("id").primaryKey(),
  giltFuer: text("gilt_fuer").notNull(), // player | team
  key: text("key").notNull(),
  name: text("name").notNull(),
  typ: text("typ").notNull(), // skala | text | auswahl
  skalaMin: integer("skala_min"),
  skalaMax: integer("skala_max"),
  auswahlOptionen: jsonb("auswahl_optionen"),
  gruppe: text("gruppe"),
  istCustom: boolean("ist_custom").notNull().default(true),
  reihenfolge: integer("reihenfolge").notNull().default(100),
  createdBy: uuid("created_by").references(() => scouts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
