CREATE TABLE "mitteilung" (
	"id" serial PRIMARY KEY NOT NULL,
	"bezug" text NOT NULL,
	"anlass_id" integer,
	"absender_id" integer,
	"gesendet_am" timestamp with time zone NOT NULL,
	"titel" text NOT NULL,
	"text" text NOT NULL,
	"auswahl" text NOT NULL,
	"weg" text NOT NULL,
	"push" integer DEFAULT 0 NOT NULL,
	"mails" integer DEFAULT 0 NOT NULL,
	"ersatz_mails" integer DEFAULT 0 NOT NULL,
	"nicht_erreichbar" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "mitteilung_bezug_check" CHECK ("mitteilung"."bezug" in ('anlass', 'verein')),
	CONSTRAINT "mitteilung_anlass_check" CHECK (("mitteilung"."bezug" = 'anlass') = ("mitteilung"."anlass_id" is not null)),
	CONSTRAINT "mitteilung_weg_check" CHECK ("mitteilung"."weg" in ('push', 'push-sonst-mail', 'push-und-mail'))
);
--> statement-breakpoint
CREATE TABLE "push_abo" (
	"endpunkt" text PRIMARY KEY NOT NULL,
	"sitzung_hash" text NOT NULL,
	"konto_id" integer NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"eingerichtet_am" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "konto" ADD COLUMN "thema_anlaesse" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "konto" ADD COLUMN "thema_cm" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "konto" ADD COLUMN "thema_verein" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "mitteilung" ADD CONSTRAINT "mitteilung_anlass_id_anlass_id_fk" FOREIGN KEY ("anlass_id") REFERENCES "public"."anlass"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mitteilung" ADD CONSTRAINT "mitteilung_absender_id_mitglied_id_fk" FOREIGN KEY ("absender_id") REFERENCES "public"."mitglied"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_abo" ADD CONSTRAINT "push_abo_sitzung_hash_sitzung_kennung_hash_fk" FOREIGN KEY ("sitzung_hash") REFERENCES "public"."sitzung"("kennung_hash") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_abo" ADD CONSTRAINT "push_abo_konto_id_konto_id_fk" FOREIGN KEY ("konto_id") REFERENCES "public"."konto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mitteilung_anlass_id_gesendet_am_idx" ON "mitteilung" USING btree ("anlass_id","gesendet_am");--> statement-breakpoint
CREATE INDEX "mitteilung_gesendet_am_idx" ON "mitteilung" USING btree ("gesendet_am");--> statement-breakpoint
CREATE INDEX "push_abo_konto_id_idx" ON "push_abo" USING btree ("konto_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_abo_sitzung_hash_unique" ON "push_abo" USING btree ("sitzung_hash");