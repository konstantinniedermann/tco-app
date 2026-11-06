ALTER TABLE "konto_rolle" DROP CONSTRAINT "konto_rolle_rolle_check";--> statement-breakpoint
-- Von Hand: Übergang der alten Rolle admin. Jedes Konto mit admin erhält MyTCO-Admin und
-- Mitglieder-Admin, damit niemand Rechte verliert; danach verschwindet admin.
INSERT INTO "konto_rolle" ("konto_id", "rolle") SELECT "konto_id", 'mytco' FROM "konto_rolle" WHERE "rolle" = 'admin' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "konto_rolle" ("konto_id", "rolle") SELECT "konto_id", 'mitglieder' FROM "konto_rolle" WHERE "rolle" = 'admin' ON CONFLICT DO NOTHING;--> statement-breakpoint
DELETE FROM "konto_rolle" WHERE "rolle" = 'admin';--> statement-breakpoint
ALTER TABLE "konto_rolle" ADD CONSTRAINT "konto_rolle_rolle_check" CHECK ("konto_rolle"."rolle" in ('mytco', 'mitglieder', 'cm', 'lizenz'));
