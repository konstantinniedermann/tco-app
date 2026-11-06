import { sql } from 'drizzle-orm';
import {
	bigint,
	boolean,
	check,
	date,
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
		// Swiss-Tennis-Klassierung (FR-37): N1..N4, R1..R9 oder «keine»; leer = nicht erfasst.
		klassierung: text('klassierung'),
		lizenznummer: text('lizenznummer'),
		// Annahme K-19.2: Gesetzt, sobald das Mitglied eine Angabe selbst geändert hat, die der Verein noch in Fairgate
		// nachführen muss; leer = nichts offen.
		fairgateOffenSeit: timestamp('fairgate_offen_seit', { withTimezone: true })
	},
	(t) => [
		check('mitglied_status_check', sql`${t.status} in ('aktiv', 'ausgetreten', 'geloescht')`),
		check('mitglied_geschlecht_check', sql`${t.geschlecht} in ('w', 'm')`),
		check(
			'mitglied_klassierung_check',
			sql`${t.klassierung} is null or ${t.klassierung} in ('N1', 'N2', 'N3', 'N4', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'keine')`
		),
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
	// Zufällige Konto-Kennung für WebAuthn (base64url aus 32 Zufallsbytes), gesetzt beim ersten Versuch, einen Passkey einzurichten.
	passkeyKennung: text('passkey_kennung').unique('konto_passkey_kennung_unique'),
	// Themen, zu denen das Mitglied Mitteilungen erhält (FR-41); neue Konten haben alle an.
	themaAnlaesse: boolean('thema_anlaesse').notNull().default(true),
	themaCm: boolean('thema_cm').notNull().default(true),
	themaVerein: boolean('thema_verein').notNull().default(true)
});

export type Thema = 'anlaesse' | 'cm' | 'verein';
export type Weg = 'push' | 'push-sonst-mail' | 'push-und-mail';
// 'cm' kommt mit dem CM-Plan.
export type Bezug = 'anlass' | 'verein';

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
		adminCodeFehlversuche: integer('admin_code_fehlversuche').notNull().default(0),
		// «Ansicht als …» des MyTCO-Admins, nur für diese Sitzung; null heisst keine Ansicht.
		ansichtRolle: text('ansicht_rolle')
	},
	(t) => [
		index('sitzung_konto_id_idx').on(t.kontoId),
		check(
			'sitzung_ansicht_rolle_check',
			sql`${t.ansichtRolle} is null or ${t.ansichtRolle} in ('mitglied', 'mitglieder', 'cm', 'lizenz')`
		)
	]
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
		check('konto_rolle_rolle_check', sql`${t.rolle} in ('mytco', 'mitglieder', 'cm', 'lizenz')`)
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

export type Antwort = 'kommt' | 'kommt-nicht';

// Anlass für alle aktiven Mitglieder (FR-27, A-ANLASS-01). Die Kalender-Kennung macht die
// Kalenderdatei ohne Login abrufbar (SI-19); sie enthält keine Personendaten.
export const anlass = pgTable(
	'anlass',
	{
		id: serial('id').primaryKey(),
		titel: text('titel').notNull(),
		beginn: timestamp('beginn', { withTimezone: true }).notNull(),
		ort: text('ort').notNull(),
		einladung: text('einladung').notNull().default(''),
		anmeldeschluss: timestamp('anmeldeschluss', { withTimezone: true }).notNull(),
		kalenderKennung: text('kalender_kennung').notNull().unique('anlass_kalender_kennung_unique'),
		// Gesetzt, sobald der Admin Beginn oder Ort ändert (FR-32).
		terminGeaendertAm: timestamp('termin_geaendert_am', { withTimezone: true }),
		erstelltVon: integer('erstellt_von').references(() => mitglied.id, { onDelete: 'set null' }),
		erstelltAm: timestamp('erstellt_am', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [check('anlass_schluss_check', sql`${t.anmeldeschluss} <= ${t.beginn}`)]
);

// Antwort eines Mitglieds zu einem Anlass; auch die Abmeldung heisst Anmeldung (Glossar).
export const anlassAnmeldung = pgTable(
	'anlass_anmeldung',
	{
		anlassId: integer('anlass_id')
			.notNull()
			.references(() => anlass.id, { onDelete: 'cascade' }),
		mitgliedId: integer('mitglied_id')
			.notNull()
			.references(() => mitglied.id, { onDelete: 'cascade' }),
		antwort: text('antwort').$type<Antwort>().notNull(),
		bemerkung: text('bemerkung'),
		geaendertAm: timestamp('geaendert_am', { withTimezone: true }).notNull()
	},
	(t) => [
		primaryKey({ columns: [t.anlassId, t.mitgliedId] }),
		check('anlass_anmeldung_antwort_check', sql`${t.antwort} in ('kommt', 'kommt-nicht')`),
		check(
			'anlass_anmeldung_bemerkung_check',
			sql`${t.antwort} = 'kommt-nicht' or ${t.bemerkung} is null`
		)
	]
);

export type TurnierStatus = 'vorbereitung' | 'offen' | 'geschlossen';
export type Geschlecht = 'herren' | 'damen' | 'mixed' | 'offen';
export type Art = 'einzel' | 'doppel';
export type KategorieStatus = 'aktiv' | 'abgesagt';

// Clubmeisterschaft eines Jahres (FR-33). Der Anmeldeschluss ist ein Datum; offen bis und mit
// 23:59 Schweizer Zeit dieses Tages.
export const turnier = pgTable(
	'turnier',
	{
		id: serial('id').primaryKey(),
		jahr: integer('jahr').notNull().unique('turnier_jahr_unique'),
		name: text('name').notNull(),
		anmeldeschluss: date('anmeldeschluss', { mode: 'string' }).notNull(),
		status: text('status').$type<TurnierStatus>().notNull().default('vorbereitung'),
		erstelltAm: timestamp('erstellt_am', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('turnier_status_check', sql`${t.status} in ('vorbereitung', 'offen', 'geschlossen')`)
	]
);

// Turniernummern bei Swiss Tennis, freiwillig (0..n).
export const turniernummer = pgTable(
	'turniernummer',
	{
		id: serial('id').primaryKey(),
		turnierId: integer('turnier_id')
			.notNull()
			.references(() => turnier.id, { onDelete: 'cascade' }),
		bezeichnung: text('bezeichnung').notNull(),
		nummer: text('nummer').notNull(),
		reihenfolge: integer('reihenfolge').notNull()
	},
	(t) => [index('turniernummer_turnier_idx').on(t.turnierId)]
);

// Kategorie eines Turniers, Einzel oder Doppel (FR-34); Absagen ohne Rückweg (FR-35).
export const kategorie = pgTable(
	'kategorie',
	{
		id: serial('id').primaryKey(),
		turnierId: integer('turnier_id')
			.notNull()
			.references(() => turnier.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		geschlecht: text('geschlecht').$type<Geschlecht>().notNull(),
		art: text('art').$type<Art>().notNull(),
		jahrgangVon: integer('jahrgang_von'),
		jahrgangBis: integer('jahrgang_bis'),
		klassierungVon: text('klassierung_von'),
		klassierungBis: text('klassierung_bis'),
		mindestsumme: integer('mindestsumme'),
		status: text('status').$type<KategorieStatus>().notNull().default('aktiv')
	},
	(t) => [
		check(
			'kategorie_geschlecht_check',
			sql`${t.geschlecht} in ('herren', 'damen', 'mixed', 'offen')`
		),
		check(
			'kategorie_art_check',
			sql`(${t.art} = 'einzel' and ${t.klassierungVon} is not null and ${t.klassierungBis} is not null and ${t.mindestsumme} is null and ${t.geschlecht} <> 'mixed') or (${t.art} = 'doppel' and ${t.klassierungVon} is null and ${t.klassierungBis} is null and ${t.mindestsumme} is not null)`
		),
		check('kategorie_status_check', sql`${t.status} in ('aktiv', 'abgesagt')`),
		uniqueIndex('kategorie_name_aktiv_unique')
			.on(t.turnierId, sql`lower(${t.name})`)
			.where(sql`${t.status} = 'aktiv'`)
	]
);

// Push-Abo eines Geräts (FR-40); hängt an der Sitzung und verschwindet mit ihr.
export const pushAbo = pgTable(
	'push_abo',
	{
		endpunkt: text('endpunkt').primaryKey(),
		sitzungHash: text('sitzung_hash')
			.notNull()
			.references(() => sitzung.kennungHash, { onDelete: 'cascade' }),
		kontoId: integer('konto_id')
			.notNull()
			.references(() => konto.id, { onDelete: 'cascade' }),
		p256dh: text('p256dh').notNull(),
		auth: text('auth').notNull(),
		eingerichtetAm: timestamp('eingerichtet_am', { withTimezone: true }).notNull()
	},
	(t) => [
		index('push_abo_konto_id_idx').on(t.kontoId),
		// FR-40: ein Abo je Sitzung, also je Gerät.
		uniqueIndex('push_abo_sitzung_hash_unique').on(t.sitzungHash)
	]
);

// Gesendete Mitteilung mit Zählern der Zustellung (FR-45).
export const mitteilung = pgTable(
	'mitteilung',
	{
		id: serial('id').primaryKey(),
		bezug: text('bezug').$type<Bezug>().notNull(),
		anlassId: integer('anlass_id').references(() => anlass.id, { onDelete: 'cascade' }),
		absenderId: integer('absender_id').references(() => mitglied.id, { onDelete: 'set null' }),
		gesendetAm: timestamp('gesendet_am', { withTimezone: true }).notNull(),
		titel: text('titel').notNull(),
		text: text('text').notNull(),
		auswahl: text('auswahl').notNull(),
		weg: text('weg').$type<Weg>().notNull(),
		push: integer('push').notNull().default(0),
		mails: integer('mails').notNull().default(0),
		ersatzMails: integer('ersatz_mails').notNull().default(0),
		nichtErreichbar: integer('nicht_erreichbar').notNull().default(0)
	},
	(t) => [
		check('mitteilung_bezug_check', sql`${t.bezug} in ('anlass', 'verein')`),
		check('mitteilung_anlass_check', sql`(${t.bezug} = 'anlass') = (${t.anlassId} is not null)`),
		check('mitteilung_weg_check', sql`${t.weg} in ('push', 'push-sonst-mail', 'push-und-mail')`),
		index('mitteilung_anlass_id_gesendet_am_idx').on(t.anlassId, t.gesendetAm),
		index('mitteilung_gesendet_am_idx').on(t.gesendetAm)
	]
);

export type AnmeldungStatus = 'bestaetigt' | 'beantragt' | 'abgelehnt' | 'zurueckgezogen';

// Anmeldung zu einer Kategorie (FR-04, FR-06); Einzel mit einem, Doppel mit zwei Spielern.
export const anmeldung = pgTable(
	'anmeldung',
	{
		id: serial('id').primaryKey(),
		kategorieId: integer('kategorie_id')
			.notNull()
			.references(() => kategorie.id, { onDelete: 'cascade' }),
		status: text('status').$type<AnmeldungStatus>().notNull().default('bestaetigt'),
		// Wildcard-Begründung (Teil 4).
		kommentar: text('kommentar'),
		angemeldetAm: timestamp('angemeldet_am', { withTimezone: true }).notNull(),
		geaendertAm: timestamp('geaendert_am', { withTimezone: true }).notNull()
	},
	(t) => [
		check(
			'anmeldung_status_check',
			sql`${t.status} in ('bestaetigt', 'beantragt', 'abgelehnt', 'zurueckgezogen')`
		),
		index('anmeldung_kategorie_idx').on(t.kategorieId)
	]
);

// Spieler einer Anmeldung. Das Mitglied wird nicht mitgelöscht: die Anmeldung bleibt bestehen.
export const anmeldungSpieler = pgTable(
	'anmeldung_spieler',
	{
		anmeldungId: integer('anmeldung_id')
			.notNull()
			.references(() => anmeldung.id, { onDelete: 'cascade' }),
		mitgliedId: integer('mitglied_id')
			.notNull()
			.references(() => mitglied.id)
	},
	(t) => [
		primaryKey({ columns: [t.anmeldungId, t.mitgliedId] }),
		index('anmeldung_spieler_mitglied_idx').on(t.mitgliedId)
	]
);
