CREATE TABLE "ic_bericht" (
	"saison" integer NOT NULL,
	"team_id" integer NOT NULL,
	"begegnung_id" integer NOT NULL,
	"tco_heim" boolean NOT NULL,
	"tco_saetze" integer NOT NULL,
	"gegner_saetze" integer NOT NULL,
	"tco_games" integer NOT NULL,
	"gegner_games" integer NOT NULL,
	CONSTRAINT "ic_bericht_saison_team_id_begegnung_id_pk" PRIMARY KEY("saison","team_id","begegnung_id")
);
--> statement-breakpoint
CREATE TABLE "ic_partie" (
	"saison" integer NOT NULL,
	"team_id" integer NOT NULL,
	"begegnung_id" integer NOT NULL,
	"art" text NOT NULL,
	"position" integer NOT NULL,
	"saetze" text[] NOT NULL,
	"aufgabe" text,
	CONSTRAINT "ic_partie_saison_team_id_begegnung_id_art_position_pk" PRIMARY KEY("saison","team_id","begegnung_id","art","position"),
	CONSTRAINT "ic_partie_art_check" CHECK ("ic_partie"."art" in ('einzel', 'doppel')),
	CONSTRAINT "ic_partie_aufgabe_check" CHECK ("ic_partie"."aufgabe" in ('tco', 'gegner'))
);
--> statement-breakpoint
CREATE TABLE "ic_spieler" (
	"saison" integer NOT NULL,
	"team_id" integer NOT NULL,
	"begegnung_id" integer NOT NULL,
	"art" text NOT NULL,
	"position" integer NOT NULL,
	"nr" integer NOT NULL,
	"st_id" integer NOT NULL,
	"name" text NOT NULL,
	"klassierung" text NOT NULL,
	"rangliste" integer NOT NULL,
	CONSTRAINT "ic_spieler_saison_team_id_begegnung_id_art_position_nr_pk" PRIMARY KEY("saison","team_id","begegnung_id","art","position","nr"),
	CONSTRAINT "ic_spieler_nr_check" CHECK ("ic_spieler"."nr" in (1, 2))
);
--> statement-breakpoint
ALTER TABLE "ic_bericht" ADD CONSTRAINT "ic_bericht_saison_team_id_ic_team_saison_team_id_fk" FOREIGN KEY ("saison","team_id") REFERENCES "public"."ic_team"("saison","team_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ic_partie" ADD CONSTRAINT "ic_partie_bericht_fk" FOREIGN KEY ("saison","team_id","begegnung_id") REFERENCES "public"."ic_bericht"("saison","team_id","begegnung_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ic_spieler" ADD CONSTRAINT "ic_spieler_partie_fk" FOREIGN KEY ("saison","team_id","begegnung_id","art","position") REFERENCES "public"."ic_partie"("saison","team_id","begegnung_id","art","position") ON DELETE cascade ON UPDATE no action;