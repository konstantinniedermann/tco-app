CREATE TABLE "ic_folgen" (
	"konto_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"seit" timestamp with time zone NOT NULL,
	CONSTRAINT "ic_folgen_konto_id_team_id_pk" PRIMARY KEY("konto_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "ic_gemeldet" (
	"saison" integer NOT NULL,
	"begegnung_id" integer NOT NULL,
	"gemeldet_am" timestamp with time zone NOT NULL,
	CONSTRAINT "ic_gemeldet_saison_begegnung_id_pk" PRIMARY KEY("saison","begegnung_id")
);
--> statement-breakpoint
ALTER TABLE "ic_folgen" ADD CONSTRAINT "ic_folgen_konto_id_konto_id_fk" FOREIGN KEY ("konto_id") REFERENCES "public"."konto"("id") ON DELETE cascade ON UPDATE no action;