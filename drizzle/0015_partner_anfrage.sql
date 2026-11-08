CREATE TABLE "partner_anfrage" (
	"id" serial PRIMARY KEY NOT NULL,
	"kategorie_id" integer NOT NULL,
	"von_id" integer NOT NULL,
	"an_id" integer NOT NULL,
	"gestellt_am" timestamp with time zone NOT NULL,
	CONSTRAINT "partner_anfrage_paar_unique" UNIQUE("kategorie_id","von_id","an_id"),
	CONSTRAINT "partner_anfrage_selbst_check" CHECK ("partner_anfrage"."von_id" <> "partner_anfrage"."an_id")
);
--> statement-breakpoint
ALTER TABLE "anmeldung" ADD COLUMN "suchtext" text;--> statement-breakpoint
ALTER TABLE "partner_anfrage" ADD CONSTRAINT "partner_anfrage_kategorie_id_kategorie_id_fk" FOREIGN KEY ("kategorie_id") REFERENCES "public"."kategorie"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_anfrage" ADD CONSTRAINT "partner_anfrage_von_id_mitglied_id_fk" FOREIGN KEY ("von_id") REFERENCES "public"."mitglied"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_anfrage" ADD CONSTRAINT "partner_anfrage_an_id_mitglied_id_fk" FOREIGN KEY ("an_id") REFERENCES "public"."mitglied"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_anfrage_an_idx" ON "partner_anfrage" USING btree ("an_id");--> statement-breakpoint
ALTER TABLE "anmeldung" ADD CONSTRAINT "anmeldung_suchtext_check" CHECK (char_length("anmeldung"."suchtext") <= 120);