CREATE TABLE "konto" (
	"id" serial PRIMARY KEY NOT NULL,
	"mitglied_id" integer NOT NULL,
	"sitzungsversion" integer DEFAULT 1 NOT NULL,
	"gesperrt" boolean DEFAULT false NOT NULL,
	"brief_code_hash" text,
	"brief_code_ablauf" timestamp with time zone,
	"brief_code_benutzt_am" timestamp with time zone,
	"mail_code_hash" text,
	"mail_code_ablauf" timestamp with time zone,
	"mail_code_fehlversuche" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "konto_mitglied_id_unique" UNIQUE("mitglied_id"),
	CONSTRAINT "konto_brief_code_hash_unique" UNIQUE("brief_code_hash")
);
--> statement-breakpoint
CREATE TABLE "mitglied" (
	"id" serial PRIMARY KEY NOT NULL,
	"vorname" text NOT NULL,
	"nachname" text NOT NULL,
	"strasse" text NOT NULL,
	"plz" text NOT NULL,
	"ort" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'aktiv' NOT NULL,
	CONSTRAINT "mitglied_email_unique" UNIQUE("email"),
	CONSTRAINT "mitglied_status_check" CHECK ("mitglied"."status" in ('aktiv', 'ausgetreten', 'geloescht'))
);
--> statement-breakpoint
CREATE TABLE "sitzung" (
	"kennung_hash" text PRIMARY KEY NOT NULL,
	"konto_id" integer NOT NULL,
	"sitzungsversion" integer NOT NULL,
	"erstellt_am" timestamp with time zone NOT NULL,
	"zuletzt_genutzt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "konto" ADD CONSTRAINT "konto_mitglied_id_mitglied_id_fk" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglied"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitzung" ADD CONSTRAINT "sitzung_konto_id_konto_id_fk" FOREIGN KEY ("konto_id") REFERENCES "public"."konto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sitzung_konto_id_idx" ON "sitzung" USING btree ("konto_id");