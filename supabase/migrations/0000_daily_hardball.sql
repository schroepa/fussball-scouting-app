CREATE TABLE "attribute_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"gilt_fuer" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"typ" text NOT NULL,
	"skala_min" integer,
	"skala_max" integer,
	"auswahl_optionen" jsonb,
	"gruppe" text,
	"ist_custom" boolean DEFAULT true NOT NULL,
	"reihenfolge" integer DEFAULT 100 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"land" text DEFAULT 'Deutschland' NOT NULL,
	"liga" text,
	"logo_url" text,
	"external_source" text,
	"external_ref" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"heim_club_id" uuid,
	"heim_club_name" text NOT NULL,
	"gast_club_id" uuid,
	"gast_club_name" text NOT NULL,
	"wettbewerb" text,
	"datum" timestamp with time zone NOT NULL,
	"spielort" text,
	"external_source" text,
	"external_ref" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"report_typ" text NOT NULL,
	"report_id" uuid NOT NULL,
	"typ" text NOT NULL,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"scout_id" uuid NOT NULL,
	"bezugstyp" text NOT NULL,
	"match_id" uuid,
	"datum" timestamp with time zone NOT NULL,
	"position_beobachtet" text,
	"ratings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gesamtbewertung" integer,
	"staerken" text,
	"schwaechen" text,
	"freitext_notizen" text,
	"empfehlung" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vorname" text NOT NULL,
	"nachname" text NOT NULL,
	"geburtsdatum" text,
	"nationalitaet" text,
	"positionen" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"starker_fuss" text,
	"groesse_cm" integer,
	"aktueller_club_id" uuid,
	"foto_url" text,
	"external_source" text,
	"external_ref" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scouts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"auth_provider" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"scout_id" uuid NOT NULL,
	"berichtsart" text NOT NULL,
	"bezugstyp" text NOT NULL,
	"match_id" uuid,
	"datum" timestamp with time zone NOT NULL,
	"formation" text,
	"spielstil" text,
	"standardsituationen" text,
	"staerken" text,
	"schwaechen" text,
	"schluesselspieler_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attribute_definitions" ADD CONSTRAINT "attribute_definitions_created_by_scouts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_created_by_scouts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_heim_club_id_clubs_id_fk" FOREIGN KEY ("heim_club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_gast_club_id_clubs_id_fk" FOREIGN KEY ("gast_club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_scouts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_scout_id_scouts_id_fk" FOREIGN KEY ("scout_id") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_aktueller_club_id_clubs_id_fk" FOREIGN KEY ("aktueller_club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_created_by_scouts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_reports" ADD CONSTRAINT "team_reports_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_reports" ADD CONSTRAINT "team_reports_scout_id_scouts_id_fk" FOREIGN KEY ("scout_id") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_reports" ADD CONSTRAINT "team_reports_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;