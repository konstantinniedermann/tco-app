CREATE TABLE "anlass" (
	"id" serial PRIMARY KEY NOT NULL,
	"titel" text NOT NULL,
	"beginn" timestamp with time zone NOT NULL,
	"ort" text NOT NULL,
	"einladung" text DEFAULT '' NOT NULL,
	"anmeldeschluss" timestamp with time zone NOT NULL,
	"kalender_kennung" text NOT NULL,
	"termin_geaendert_am" timestamp with time zone,
	"erstellt_von" integer,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anlass_kalender_kennung_unique" UNIQUE("kalender_kennung"),
	CONSTRAINT "anlass_schluss_check" CHECK ("anlass"."anmeldeschluss" <= "anlass"."beginn")
);
--> statement-breakpoint
CREATE TABLE "anlass_anmeldung" (
	"anlass_id" integer NOT NULL,
	"mitglied_id" integer NOT NULL,
	"antwort" text NOT NULL,
	"bemerkung" text,
	"geaendert_am" timestamp with time zone NOT NULL,
	CONSTRAINT "anlass_anmeldung_anlass_id_mitglied_id_pk" PRIMARY KEY("anlass_id","mitglied_id"),
	CONSTRAINT "anlass_anmeldung_antwort_check" CHECK ("anlass_anmeldung"."antwort" in ('kommt', 'kommt-nicht')),
	CONSTRAINT "anlass_anmeldung_bemerkung_check" CHECK ("anlass_anmeldung"."antwort" = 'kommt-nicht' or "anlass_anmeldung"."bemerkung" is null)
);
--> statement-breakpoint
ALTER TABLE "anlass" ADD CONSTRAINT "anlass_erstellt_von_mitglied_id_fk" FOREIGN KEY ("erstellt_von") REFERENCES "public"."mitglied"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anlass_anmeldung" ADD CONSTRAINT "anlass_anmeldung_anlass_id_anlass_id_fk" FOREIGN KEY ("anlass_id") REFERENCES "public"."anlass"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anlass_anmeldung" ADD CONSTRAINT "anlass_anmeldung_mitglied_id_mitglied_id_fk" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglied"("id") ON DELETE cascade ON UPDATE no action;