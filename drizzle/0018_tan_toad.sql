CREATE TABLE "gespraech" (
	"id" serial PRIMARY KEY NOT NULL,
	"turnier_id" integer NOT NULL,
	"mitglied_id" integer NOT NULL,
	"zustand" text DEFAULT 'offen' NOT NULL,
	"gelesen_am" timestamp with time zone,
	"letzte_am" timestamp with time zone NOT NULL,
	CONSTRAINT "gespraech_turnier_mitglied_unique" UNIQUE("turnier_id","mitglied_id"),
	CONSTRAINT "gespraech_zustand_check" CHECK ("gespraech"."zustand" in ('offen', 'erledigt'))
);
--> statement-breakpoint
CREATE TABLE "nachricht" (
	"id" serial PRIMARY KEY NOT NULL,
	"gespraech_id" integer NOT NULL,
	"von" text NOT NULL,
	"admin_mitglied_id" integer,
	"text" text NOT NULL,
	"gesendet_am" timestamp with time zone NOT NULL,
	CONSTRAINT "nachricht_von_check" CHECK ("nachricht"."von" in ('mitglied', 'leitung')),
	CONSTRAINT "nachricht_text_check" CHECK (char_length("nachricht"."text") between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "gespraech" ADD CONSTRAINT "gespraech_turnier_id_turnier_id_fk" FOREIGN KEY ("turnier_id") REFERENCES "public"."turnier"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gespraech" ADD CONSTRAINT "gespraech_mitglied_id_mitglied_id_fk" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglied"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nachricht" ADD CONSTRAINT "nachricht_gespraech_id_gespraech_id_fk" FOREIGN KEY ("gespraech_id") REFERENCES "public"."gespraech"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nachricht" ADD CONSTRAINT "nachricht_admin_mitglied_id_mitglied_id_fk" FOREIGN KEY ("admin_mitglied_id") REFERENCES "public"."mitglied"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nachricht_gespraech_idx" ON "nachricht" USING btree ("gespraech_id");