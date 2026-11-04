DROP INDEX "mitglied_mitgliedernummer_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "mitglied_mitgliedernummer_klein_unique" ON "mitglied" USING btree (lower("mitgliedernummer"));