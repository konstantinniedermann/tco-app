CREATE TABLE "anmeldung" (
	"id" serial PRIMARY KEY NOT NULL,
	"kategorie_id" integer NOT NULL,
	"status" text DEFAULT 'bestaetigt' NOT NULL,
	"kommentar" text,
	"angemeldet_am" timestamp with time zone NOT NULL,
	"geaendert_am" timestamp with time zone NOT NULL,
	CONSTRAINT "anmeldung_status_check" CHECK ("anmeldung"."status" in ('bestaetigt', 'beantragt', 'abgelehnt', 'zurueckgezogen'))
);
--> statement-breakpoint
CREATE TABLE "anmeldung_spieler" (
	"anmeldung_id" integer NOT NULL,
	"mitglied_id" integer NOT NULL,
	CONSTRAINT "anmeldung_spieler_anmeldung_id_mitglied_id_pk" PRIMARY KEY("anmeldung_id","mitglied_id")
);
--> statement-breakpoint
ALTER TABLE "mitglied" ADD COLUMN "klassierung" text;--> statement-breakpoint
ALTER TABLE "anmeldung" ADD CONSTRAINT "anmeldung_kategorie_id_kategorie_id_fk" FOREIGN KEY ("kategorie_id") REFERENCES "public"."kategorie"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anmeldung_spieler" ADD CONSTRAINT "anmeldung_spieler_anmeldung_id_anmeldung_id_fk" FOREIGN KEY ("anmeldung_id") REFERENCES "public"."anmeldung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anmeldung_spieler" ADD CONSTRAINT "anmeldung_spieler_mitglied_id_mitglied_id_fk" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglied"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anmeldung_kategorie_idx" ON "anmeldung" USING btree ("kategorie_id");--> statement-breakpoint
CREATE INDEX "anmeldung_spieler_mitglied_idx" ON "anmeldung_spieler" USING btree ("mitglied_id");--> statement-breakpoint
ALTER TABLE "mitglied" ADD CONSTRAINT "mitglied_klassierung_check" CHECK ("mitglied"."klassierung" is null or "mitglied"."klassierung" in ('N1', 'N2', 'N3', 'N4', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'keine'));