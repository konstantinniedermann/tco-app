ALTER TABLE "mitteilung" DROP CONSTRAINT "mitteilung_bezug_check";--> statement-breakpoint
ALTER TABLE "mitteilung" ADD COLUMN "turnier_id" integer;--> statement-breakpoint
ALTER TABLE "mitteilung" ADD COLUMN "kategorie" text;--> statement-breakpoint
ALTER TABLE "mitteilung" ADD CONSTRAINT "mitteilung_turnier_id_turnier_id_fk" FOREIGN KEY ("turnier_id") REFERENCES "public"."turnier"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mitteilung_turnier_id_gesendet_am_idx" ON "mitteilung" USING btree ("turnier_id","gesendet_am");--> statement-breakpoint
ALTER TABLE "mitteilung" ADD CONSTRAINT "mitteilung_turnier_check" CHECK (("mitteilung"."bezug" = 'turnier') = ("mitteilung"."turnier_id" is not null));--> statement-breakpoint
ALTER TABLE "mitteilung" ADD CONSTRAINT "mitteilung_kategorie_check" CHECK ("mitteilung"."kategorie" is null or "mitteilung"."bezug" = 'turnier');--> statement-breakpoint
ALTER TABLE "mitteilung" ADD CONSTRAINT "mitteilung_bezug_check" CHECK ("mitteilung"."bezug" in ('anlass', 'verein', 'turnier'));