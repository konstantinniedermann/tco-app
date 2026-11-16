CREATE TABLE "ic_begegnung" (
	"saison" integer NOT NULL,
	"team_id" integer NOT NULL,
	"begegnung_id" integer NOT NULL,
	"runde" integer NOT NULL,
	"datum" date NOT NULL,
	"heim" text NOT NULL,
	"gast" text NOT NULL,
	"heim_punkte" integer,
	"gast_punkte" integer,
	CONSTRAINT "ic_begegnung_saison_team_id_begegnung_id_pk" PRIMARY KEY("saison","team_id","begegnung_id")
);
--> statement-breakpoint
CREATE TABLE "ic_entscheid" (
	"saison" integer NOT NULL,
	"team_id" integer NOT NULL,
	"begegnung_id" integer NOT NULL,
	"art" text NOT NULL,
	"runde" integer NOT NULL,
	"datum" date NOT NULL,
	"zeit" text,
	"heim_id" integer NOT NULL,
	"heim_name" text NOT NULL,
	"heim_punkte" integer,
	"heim_markiert" boolean NOT NULL,
	"gast_id" integer NOT NULL,
	"gast_name" text NOT NULL,
	"gast_punkte" integer,
	"gast_markiert" boolean NOT NULL,
	CONSTRAINT "ic_entscheid_saison_team_id_begegnung_id_pk" PRIMARY KEY("saison","team_id","begegnung_id"),
	CONSTRAINT "ic_entscheid_art_check" CHECK ("ic_entscheid"."art" in ('aufstieg', 'abstieg'))
);
--> statement-breakpoint
CREATE TABLE "ic_rang" (
	"saison" integer NOT NULL,
	"team_id" integer NOT NULL,
	"rang" integer NOT NULL,
	"team_name" text NOT NULL,
	"st_team_id" integer NOT NULL,
	"punkte" integer NOT NULL,
	"saetze" text NOT NULL,
	CONSTRAINT "ic_rang_saison_team_id_st_team_id_pk" PRIMARY KEY("saison","team_id","st_team_id")
);
--> statement-breakpoint
CREATE TABLE "ic_stand" (
	"saison" integer NOT NULL,
	"wettbewerb" text NOT NULL,
	"abgerufen_am" timestamp with time zone NOT NULL,
	CONSTRAINT "ic_stand_saison_wettbewerb_pk" PRIMARY KEY("saison","wettbewerb"),
	CONSTRAINT "ic_stand_wettbewerb_check" CHECK ("ic_stand"."wettbewerb" in ('ic', 'jic'))
);
--> statement-breakpoint
CREATE TABLE "ic_team" (
	"saison" integer NOT NULL,
	"team_id" integer NOT NULL,
	"wettbewerb" text NOT NULL,
	"team_name" text NOT NULL,
	"liga" text NOT NULL,
	"gruppe" integer NOT NULL,
	"reihenfolge" integer NOT NULL,
	CONSTRAINT "ic_team_saison_team_id_pk" PRIMARY KEY("saison","team_id"),
	CONSTRAINT "ic_team_wettbewerb_check" CHECK ("ic_team"."wettbewerb" in ('ic', 'jic'))
);
--> statement-breakpoint
ALTER TABLE "ic_begegnung" ADD CONSTRAINT "ic_begegnung_saison_team_id_ic_team_saison_team_id_fk" FOREIGN KEY ("saison","team_id") REFERENCES "public"."ic_team"("saison","team_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ic_entscheid" ADD CONSTRAINT "ic_entscheid_saison_team_id_ic_team_saison_team_id_fk" FOREIGN KEY ("saison","team_id") REFERENCES "public"."ic_team"("saison","team_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ic_rang" ADD CONSTRAINT "ic_rang_saison_team_id_ic_team_saison_team_id_fk" FOREIGN KEY ("saison","team_id") REFERENCES "public"."ic_team"("saison","team_id") ON DELETE cascade ON UPDATE no action;