ALTER TABLE "partner_anfrage" DROP CONSTRAINT "partner_anfrage_paar_unique";--> statement-breakpoint
-- Alte Testdaten: je Kategorie und Anfragendem nur die älteste offene Anfrage behalten (MyTCO ist noch nicht live).
DELETE FROM "partner_anfrage" a USING "partner_anfrage" b WHERE a."kategorie_id" = b."kategorie_id" AND a."von_id" = b."von_id" AND a."id" > b."id";--> statement-breakpoint
ALTER TABLE "partner_anfrage" ADD CONSTRAINT "partner_anfrage_von_unique" UNIQUE("kategorie_id","von_id");