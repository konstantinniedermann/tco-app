ALTER TABLE "mitglied" DROP CONSTRAINT "mitglied_status_check";--> statement-breakpoint
ALTER TABLE "mitglied" ALTER COLUMN "strasse" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mitglied" ALTER COLUMN "plz" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mitglied" ALTER COLUMN "ort" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mitglied" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mitglied" ADD COLUMN "austritt_am" timestamp with time zone;--> statement-breakpoint
-- Bestand: Bisher setzte kein Code den Austritt; Frist läuft ab dem Einspielen.
UPDATE "mitglied" SET "austritt_am" = now() WHERE "status" = 'ausgetreten';--> statement-breakpoint
ALTER TABLE "mitglied" ADD COLUMN "vorgemerkt_am" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mitglied" ADD COLUMN "status_vorher" text;--> statement-breakpoint
ALTER TABLE "mitglied" ADD CONSTRAINT "mitglied_geloescht_check" CHECK ("mitglied"."status" = 'geloescht' or ("mitglied"."email" is not null and "mitglied"."strasse" is not null and "mitglied"."plz" is not null and "mitglied"."ort" is not null));--> statement-breakpoint
ALTER TABLE "mitglied" ADD CONSTRAINT "mitglied_status_vorher_check" CHECK ("mitglied"."status_vorher" is null or "mitglied"."status_vorher" in ('aktiv', 'ausgetreten'));--> statement-breakpoint
ALTER TABLE "mitglied" ADD CONSTRAINT "mitglied_vorgemerkt_check" CHECK ("mitglied"."status" <> 'vorgemerkt' or ("mitglied"."vorgemerkt_am" is not null and "mitglied"."status_vorher" is not null));--> statement-breakpoint
ALTER TABLE "mitglied" ADD CONSTRAINT "mitglied_ausgetreten_check" CHECK ("mitglied"."status" <> 'ausgetreten' or "mitglied"."austritt_am" is not null);--> statement-breakpoint
ALTER TABLE "mitglied" ADD CONSTRAINT "mitglied_status_check" CHECK ("mitglied"."status" in ('aktiv', 'ausgetreten', 'vorgemerkt', 'geloescht'));