CREATE TABLE "passkey" (
	"kennung" text PRIMARY KEY NOT NULL,
	"konto_id" integer NOT NULL,
	"oeffentlicher_schluessel" text NOT NULL,
	"zaehler" bigint DEFAULT 0 NOT NULL,
	"transporte" text[] DEFAULT '{}'::text[] NOT NULL,
	"rp_id" text NOT NULL,
	"geraet" text NOT NULL,
	"eingerichtet_am" timestamp with time zone NOT NULL,
	"zuletzt_benutzt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "konto" ADD COLUMN "passkey_kennung" text;--> statement-breakpoint
ALTER TABLE "sitzung" ADD COLUMN "passkey_hinweis" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_konto_id_konto_id_fk" FOREIGN KEY ("konto_id") REFERENCES "public"."konto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "passkey_konto_id_idx" ON "passkey" USING btree ("konto_id");--> statement-breakpoint
ALTER TABLE "konto" ADD CONSTRAINT "konto_passkey_kennung_unique" UNIQUE("passkey_kennung");