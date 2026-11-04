import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

export const mitglied = pgTable(
	'mitglied',
	{
		id: serial('id').primaryKey(),
		vorname: text('vorname').notNull(),
		nachname: text('nachname').notNull(),
		strasse: text('strasse').notNull(),
		plz: text('plz').notNull(),
		ort: text('ort').notNull(),
		email: text('email').notNull().unique('mitglied_email_unique'),
		status: text('status').notNull().default('aktiv')
	},
	(t) => [
		check('mitglied_status_check', sql`${t.status} in ('aktiv', 'ausgetreten', 'geloescht')`),
		// Der Login sucht die Adresse ohne Rücksicht auf Gross-/Kleinschreibung: sie muss auch so eindeutig sein.
		uniqueIndex('mitglied_email_klein_unique').on(sql`lower(${t.email})`)
	]
);

export const konto = pgTable('konto', {
	id: serial('id').primaryKey(),
	mitgliedId: integer('mitglied_id')
		.notNull()
		.unique('konto_mitglied_id_unique')
		.references(() => mitglied.id, { onDelete: 'cascade' }),
	sitzungsversion: integer('sitzungsversion').notNull().default(1),
	gesperrt: boolean('gesperrt').notNull().default(false),
	briefCodeHash: text('brief_code_hash').unique('konto_brief_code_hash_unique'),
	briefCodeAblauf: timestamp('brief_code_ablauf', { withTimezone: true }),
	briefCodeBenutztAm: timestamp('brief_code_benutzt_am', { withTimezone: true }),
	mailCodeHash: text('mail_code_hash'),
	mailCodeAblauf: timestamp('mail_code_ablauf', { withTimezone: true }),
	mailCodeFehlversuche: integer('mail_code_fehlversuche').notNull().default(0),
	// Zufällige Konto-Kennung für WebAuthn (base64url aus 32 Zufallsbytes), erst beim ersten Passkey gesetzt.
	passkeyKennung: text('passkey_kennung').unique('konto_passkey_kennung_unique')
});

export const sitzung = pgTable(
	'sitzung',
	{
		kennungHash: text('kennung_hash').primaryKey(),
		kontoId: integer('konto_id')
			.notNull()
			.references(() => konto.id, { onDelete: 'cascade' }),
		sitzungsversion: integer('sitzungsversion').notNull(),
		erstelltAm: timestamp('erstellt_am', { withTimezone: true }).notNull(),
		zuletztGenutzt: timestamp('zuletzt_genutzt', { withTimezone: true }).notNull(),
		passkeyHinweis: boolean('passkey_hinweis').notNull().default(false)
	},
	(t) => [index('sitzung_konto_id_idx').on(t.kontoId)]
);

export const passkey = pgTable(
	'passkey',
	{
		// Credential-ID, base64url
		kennung: text('kennung').primaryKey(),
		kontoId: integer('konto_id')
			.notNull()
			.references(() => konto.id, { onDelete: 'cascade' }),
		// base64url
		oeffentlicherSchluessel: text('oeffentlicher_schluessel').notNull(),
		zaehler: integer('zaehler').notNull().default(0),
		transporte: text('transporte')
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),
		rpId: text('rp_id').notNull(),
		geraet: text('geraet').notNull(),
		eingerichtetAm: timestamp('eingerichtet_am', { withTimezone: true }).notNull(),
		zuletztBenutzt: timestamp('zuletzt_benutzt', { withTimezone: true })
	},
	(t) => [index('passkey_konto_id_idx').on(t.kontoId)]
);
