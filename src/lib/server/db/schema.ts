import { sql } from 'drizzle-orm';
import {
	bigint,
	boolean,
	check,
	index,
	integer,
	pgTable,
	primaryKey,
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
		status: text('status').notNull().default('aktiv'),
		// Leer erlaubt (mehrere Mitglieder ohne Nummer); gesetzt ist sie eindeutig, ohne Rücksicht auf
		// Gross-/Kleinschreibung («A12» = «a12»), gespeichert wie eingegeben.
		mitgliedernummer: text('mitgliedernummer'),
		telefon: text('telefon'),
		geschlecht: text('geschlecht'),
		jahrgang: integer('jahrgang'),
		lizenznummer: text('lizenznummer')
	},
	(t) => [
		check('mitglied_status_check', sql`${t.status} in ('aktiv', 'ausgetreten', 'geloescht')`),
		check('mitglied_geschlecht_check', sql`${t.geschlecht} in ('w', 'm')`),
		uniqueIndex('mitglied_mitgliedernummer_klein_unique').on(sql`lower(${t.mitgliedernummer})`),
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
		passkeyHinweis: boolean('passkey_hinweis').notNull().default(false),
		adminBestaetigtAm: timestamp('admin_bestaetigt_am', { withTimezone: true }),
		adminCodeHash: text('admin_code_hash'),
		adminCodeAblauf: timestamp('admin_code_ablauf', { withTimezone: true }),
		adminCodeFehlversuche: integer('admin_code_fehlversuche').notNull().default(0)
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
		zaehler: bigint('zaehler', { mode: 'number' }).notNull().default(0),
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

export const kontoRolle = pgTable(
	'konto_rolle',
	{
		kontoId: integer('konto_id')
			.notNull()
			.references(() => konto.id, { onDelete: 'cascade' }),
		rolle: text('rolle').notNull()
	},
	(t) => [
		primaryKey({ columns: [t.kontoId, t.rolle] }),
		check('konto_rolle_rolle_check', sql`${t.rolle} in ('admin', 'cm', 'lizenz')`)
	]
);

// Änderungsverlauf ohne alte und neue Werte (FR-26); `detail` nennt nur Feld- oder Rollennamen.
export const aenderung = pgTable(
	'aenderung',
	{
		id: serial('id').primaryKey(),
		mitgliedId: integer('mitglied_id')
			.notNull()
			.references(() => mitglied.id, { onDelete: 'cascade' }),
		zeitpunkt: timestamp('zeitpunkt', { withTimezone: true }).notNull().defaultNow(),
		urheberArt: text('urheber_art').notNull(),
		urheberMitgliedId: integer('urheber_mitglied_id').references(() => mitglied.id, {
			onDelete: 'set null'
		}),
		aktion: text('aktion').notNull(),
		detail: text('detail')
	},
	(t) => [
		check(
			'aenderung_urheber_art_check',
			sql`${t.urheberArt} in ('admin', 'mitglied', 'automatisch')`
		),
		index('aenderung_mitglied_zeitpunkt_idx').on(t.mitgliedId, t.zeitpunkt),
		index('aenderung_zeitpunkt_idx').on(t.zeitpunkt)
	]
);
