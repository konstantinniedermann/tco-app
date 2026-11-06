CREATE TABLE "kategorie" (
	"id" serial PRIMARY KEY NOT NULL,
	"turnier_id" integer NOT NULL,
	"name" text NOT NULL,
	"geschlecht" text NOT NULL,
	"art" text NOT NULL,
	"jahrgang_von" integer,
	"jahrgang_bis" integer,
	"klassierung_von" text,
	"klassierung_bis" text,
	"mindestsumme" integer,
	"status" text DEFAULT 'aktiv' NOT NULL,
	CONSTRAINT "kategorie_geschlecht_check" CHECK ("kategorie"."geschlecht" in ('herren', 'damen', 'mixed', 'offen')),
	CONSTRAINT "kategorie_art_check" CHECK (("kategorie"."art" = 'einzel' and "kategorie"."klassierung_von" is not null and "kategorie"."klassierung_bis" is not null and "kategorie"."mindestsumme" is null and "kategorie"."geschlecht" <> 'mixed') or ("kategorie"."art" = 'doppel' and "kategorie"."klassierung_von" is null and "kategorie"."klassierung_bis" is null and "kategorie"."mindestsumme" is not null)),
	CONSTRAINT "kategorie_status_check" CHECK ("kategorie"."status" in ('aktiv', 'abgesagt'))
);
--> statement-breakpoint
CREATE TABLE "turnier" (
	"id" serial PRIMARY KEY NOT NULL,
	"jahr" integer NOT NULL,
	"name" text NOT NULL,
	"anmeldeschluss" date NOT NULL,
	"status" text DEFAULT 'vorbereitung' NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "turnier_jahr_unique" UNIQUE("jahr"),
	CONSTRAINT "turnier_status_check" CHECK ("turnier"."status" in ('vorbereitung', 'offen', 'geschlossen'))
);
--> statement-breakpoint
CREATE TABLE "turniernummer" (
	"id" serial PRIMARY KEY NOT NULL,
	"turnier_id" integer NOT NULL,
	"bezeichnung" text NOT NULL,
	"nummer" text NOT NULL,
	"reihenfolge" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kategorie" ADD CONSTRAINT "kategorie_turnier_id_turnier_id_fk" FOREIGN KEY ("turnier_id") REFERENCES "public"."turnier"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turniernummer" ADD CONSTRAINT "turniernummer_turnier_id_turnier_id_fk" FOREIGN KEY ("turnier_id") REFERENCES "public"."turnier"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kategorie_name_aktiv_unique" ON "kategorie" USING btree ("turnier_id",lower("name")) WHERE "kategorie"."status" = 'aktiv';--> statement-breakpoint
CREATE INDEX "turniernummer_turnier_idx" ON "turniernummer" USING btree ("turnier_id");