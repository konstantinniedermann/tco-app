CREATE TABLE "aenderung" (
	"id" serial PRIMARY KEY NOT NULL,
	"mitglied_id" integer NOT NULL,
	"zeitpunkt" timestamp with time zone DEFAULT now() NOT NULL,
	"urheber_art" text NOT NULL,
	"urheber_mitglied_id" integer,
	"aktion" text NOT NULL,
	"detail" text,
	CONSTRAINT "aenderung_urheber_art_check" CHECK ("aenderung"."urheber_art" in ('admin', 'mitglied', 'automatisch'))
);
--> statement-breakpoint
CREATE TABLE "konto_rolle" (
	"konto_id" integer NOT NULL,
	"rolle" text NOT NULL,
	CONSTRAINT "konto_rolle_konto_id_rolle_pk" PRIMARY KEY("konto_id","rolle"),
	CONSTRAINT "konto_rolle_rolle_check" CHECK ("konto_rolle"."rolle" in ('admin', 'cm', 'lizenz'))
);
--> statement-breakpoint
ALTER TABLE "mitglied" ADD COLUMN "mitgliedernummer" text;--> statement-breakpoint
ALTER TABLE "mitglied" ADD COLUMN "telefon" text;--> statement-breakpoint
ALTER TABLE "mitglied" ADD COLUMN "geschlecht" text;--> statement-breakpoint
ALTER TABLE "mitglied" ADD COLUMN "jahrgang" integer;--> statement-breakpoint
ALTER TABLE "mitglied" ADD COLUMN "lizenznummer" text;--> statement-breakpoint
ALTER TABLE "sitzung" ADD COLUMN "admin_bestaetigt_am" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sitzung" ADD COLUMN "admin_code_hash" text;--> statement-breakpoint
ALTER TABLE "sitzung" ADD COLUMN "admin_code_ablauf" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sitzung" ADD COLUMN "admin_code_fehlversuche" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "aenderung" ADD CONSTRAINT "aenderung_mitglied_id_mitglied_id_fk" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglied"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aenderung" ADD CONSTRAINT "aenderung_urheber_mitglied_id_mitglied_id_fk" FOREIGN KEY ("urheber_mitglied_id") REFERENCES "public"."mitglied"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konto_rolle" ADD CONSTRAINT "konto_rolle_konto_id_konto_id_fk" FOREIGN KEY ("konto_id") REFERENCES "public"."konto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aenderung_mitglied_zeitpunkt_idx" ON "aenderung" USING btree ("mitglied_id","zeitpunkt");--> statement-breakpoint
CREATE INDEX "aenderung_zeitpunkt_idx" ON "aenderung" USING btree ("zeitpunkt");--> statement-breakpoint
CREATE UNIQUE INDEX "mitglied_mitgliedernummer_unique" ON "mitglied" USING btree ("mitgliedernummer");--> statement-breakpoint
ALTER TABLE "mitglied" ADD CONSTRAINT "mitglied_geschlecht_check" CHECK ("mitglied"."geschlecht" in ('w', 'm'));