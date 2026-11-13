import { sql } from 'drizzle-orm';
import {
	bigint,
	boolean,
	check,
	date,
	foreignKey,
	index,
	integer,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	unique,
	uniqueIndex
} from 'drizzle-orm/pg-core';

export const mitglied = pgTable(
	'mitglied',
	{
		id: serial('id').primaryKey(),
		vorname: text('vorname').notNull(),
		nachname: text('nachname').notNull(),
		// Freiwillig; pflegt nur das Mitglied selbst im Profil.
		rufname: text('rufname'),
		strasse: text('strasse'),
		plz: text('plz'),
		ort: text('ort'),
		email: text('email').unique('mitglied_email_unique'),
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
		fairgateOffenSeit: timestamp('fairgate_offen_seit', { withTimezone: true }),
		// Zeitpunkt, an dem der Austritt erfasst wurde; die Aufbewahrungsfrist läuft ab hier. Leer = nie ausgetreten.
		austrittAm: timestamp('austritt_am', { withTimezone: true }),
		// Zeitpunkt, an dem das Mitglied zum Löschen vorgemerkt wurde; die Bedenkzeit läuft ab hier.
		vorgemerktAm: timestamp('vorgemerkt_am', { withTimezone: true }),
		// Status vor dem Vormerken (zur Rücknahme); nur bei `vorgemerkt` gesetzt.
		statusVorher: text('status_vorher')
	},
	(t) => [
		check(
			'mitglied_status_check',
			sql`${t.status} in ('aktiv', 'ausgetreten', 'vorgemerkt', 'geloescht')`
		),
		// Adresse und E-Mail dürfen nur bei gelöschten Mitgliedern fehlen.
		check(
			'mitglied_geloescht_check',
			sql`${t.status} = 'geloescht' or (${t.email} is not null and ${t.strasse} is not null and ${t.plz} is not null and ${t.ort} is not null)`
		),
		check(
			'mitglied_status_vorher_check',
			sql`${t.statusVorher} is null or ${t.statusVorher} in ('aktiv', 'ausgetreten')`
		),
		check(
			'mitglied_vorgemerkt_check',
			sql`${t.status} <> 'vorgemerkt' or (${t.vorgemerktAm} is not null and ${t.statusVorher} is not null)`
		),
		check(
			'mitglied_ausgetreten_check',
			sql`${t.status} <> 'ausgetreten' or ${t.austrittAm} is not null`
		),
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
		erstelltAm: timestamp('erstellt_am', { withTimezone: true }).notNull().defaultNow(),
		// Kontaktperson für Fragen der Mitglieder, ein CM-Admin; freiwillig.
		kontaktMitgliedId: integer('kontakt_mitglied_id').references(() => mitglied.id, {
			onDelete: 'set null'
		})
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
		// «Sucht Partner» (FR-49): freier Hinweis der Anmeldung, höchstens 120 Zeichen.
		suchtext: text('suchtext'),
		angemeldetAm: timestamp('angemeldet_am', { withTimezone: true }).notNull(),
		geaendertAm: timestamp('geaendert_am', { withTimezone: true }).notNull()
	},
	(t) => [
		check(
			'anmeldung_status_check',
			sql`${t.status} in ('bestaetigt', 'beantragt', 'abgelehnt', 'zurueckgezogen')`
		),
		check('anmeldung_suchtext_check', sql`char_length(${t.suchtext}) <= 120`),
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

// Offene Partner-Anfrage (FR-48). Nur offene Anfragen werden gespeichert; erledigte werden gelöscht.
// Die Mitglieder werden nicht mitgelöscht: eine Anfrage hängt nur an der Kategorie.
export const partnerAnfrage = pgTable(
	'partner_anfrage',
	{
		id: serial('id').primaryKey(),
		kategorieId: integer('kategorie_id')
			.notNull()
			.references(() => kategorie.id, { onDelete: 'cascade' }),
		vonId: integer('von_id')
			.notNull()
			.references(() => mitglied.id),
		anId: integer('an_id')
			.notNull()
			.references(() => mitglied.id),
		gestelltAm: timestamp('gestellt_am', { withTimezone: true }).notNull()
	},
	(t) => [
		// Höchstens eine eigene offene Anfrage je Person und Kategorie.
		unique('partner_anfrage_von_unique').on(t.kategorieId, t.vonId),
		check('partner_anfrage_selbst_check', sql`${t.vonId} <> ${t.anId}`),
		index('partner_anfrage_an_idx').on(t.anId)
	]
);

// Gespräch zwischen einem Mitglied und der Turnierleitung (FR-50): höchstens eines je Turnier
// und Mitglied. Es entsteht mit der ersten Nachricht des Mitglieds.
export const gespraech = pgTable(
	'gespraech',
	{
		id: serial('id').primaryKey(),
		turnierId: integer('turnier_id')
			.notNull()
			.references(() => turnier.id, { onDelete: 'cascade' }),
		mitgliedId: integer('mitglied_id')
			.notNull()
			.references(() => mitglied.id),
		zustand: text('zustand').$type<'offen' | 'erledigt'>().notNull().default('offen'),
		// Wann das Mitglied das Gespräch zuletzt geöffnet hat (für «neue Antwort»).
		gelesenAm: timestamp('gelesen_am', { withTimezone: true }),
		letzteAm: timestamp('letzte_am', { withTimezone: true }).notNull()
	},
	(t) => [
		unique('gespraech_turnier_mitglied_unique').on(t.turnierId, t.mitgliedId),
		check('gespraech_zustand_check', sql`${t.zustand} in ('offen', 'erledigt')`)
	]
);

// Eine Nachricht im Gespräch; von der Leitung nur mit dem Admin, der sie geschrieben hat.
export const nachricht = pgTable(
	'nachricht',
	{
		id: serial('id').primaryKey(),
		gespraechId: integer('gespraech_id')
			.notNull()
			.references(() => gespraech.id, { onDelete: 'cascade' }),
		von: text('von').$type<'mitglied' | 'leitung'>().notNull(),
		adminMitgliedId: integer('admin_mitglied_id').references(() => mitglied.id),
		text: text('text').notNull(),
		gesendetAm: timestamp('gesendet_am', { withTimezone: true }).notNull()
	},
	(t) => [
		check('nachricht_von_check', sql`${t.von} in ('mitglied', 'leitung')`),
		check('nachricht_text_check', sql`char_length(${t.text}) between 1 and 1000`),
		index('nachricht_gespraech_idx').on(t.gespraechId)
	]
);

// Interclub-Ansicht: Spiegel der Antworten von Swiss Tennis, je Saison und Wettbewerb ('ic' oder 'jic').
export const icTeam = pgTable(
	'ic_team',
	{
		saison: integer('saison').notNull(),
		teamId: integer('team_id').notNull(),
		wettbewerb: text('wettbewerb').$type<'ic' | 'jic'>().notNull(),
		teamName: text('team_name').notNull(),
		liga: text('liga').notNull(),
		gruppe: integer('gruppe').notNull(),
		reihenfolge: integer('reihenfolge').notNull()
	},
	(t) => [
		primaryKey({ columns: [t.saison, t.teamId] }),
		check('ic_team_wettbewerb_check', sql`${t.wettbewerb} in ('ic', 'jic')`)
	]
);

export const icBegegnung = pgTable(
	'ic_begegnung',
	{
		saison: integer('saison').notNull(),
		teamId: integer('team_id').notNull(),
		begegnungId: integer('begegnung_id').notNull(),
		runde: integer('runde').notNull(),
		datum: date('datum', { mode: 'string' }).notNull(),
		heim: text('heim').notNull(),
		gast: text('gast').notNull(),
		heimPunkte: integer('heim_punkte'),
		gastPunkte: integer('gast_punkte')
	},
	(t) => [
		primaryKey({ columns: [t.saison, t.teamId, t.begegnungId] }),
		foreignKey({
			columns: [t.saison, t.teamId],
			foreignColumns: [icTeam.saison, icTeam.teamId]
		}).onDelete('cascade')
	]
);

export const icRang = pgTable(
	'ic_rang',
	{
		saison: integer('saison').notNull(),
		teamId: integer('team_id').notNull(),
		rang: integer('rang').notNull(),
		teamName: text('team_name').notNull(),
		stTeamId: integer('st_team_id').notNull(),
		punkte: integer('punkte').notNull(),
		saetze: text('saetze').notNull()
	},
	(t) => [
		primaryKey({ columns: [t.saison, t.teamId, t.stTeamId] }),
		foreignKey({
			columns: [t.saison, t.teamId],
			foreignColumns: [icTeam.saison, icTeam.teamId]
		}).onDelete('cascade')
	]
);

export const icEntscheid = pgTable(
	'ic_entscheid',
	{
		saison: integer('saison').notNull(),
		teamId: integer('team_id').notNull(),
		begegnungId: integer('begegnung_id').notNull(),
		art: text('art').$type<'aufstieg' | 'abstieg'>().notNull(),
		runde: integer('runde').notNull(),
		datum: date('datum', { mode: 'string' }).notNull(),
		zeit: text('zeit'),
		heimId: integer('heim_id').notNull(),
		heimName: text('heim_name').notNull(),
		heimPunkte: integer('heim_punkte'),
		heimMarkiert: boolean('heim_markiert').notNull(),
		gastId: integer('gast_id').notNull(),
		gastName: text('gast_name').notNull(),
		gastPunkte: integer('gast_punkte'),
		gastMarkiert: boolean('gast_markiert').notNull()
	},
	(t) => [
		primaryKey({ columns: [t.saison, t.teamId, t.begegnungId] }),
		foreignKey({
			columns: [t.saison, t.teamId],
			foreignColumns: [icTeam.saison, icTeam.teamId]
		}).onDelete('cascade'),
		check('ic_entscheid_art_check', sql`${t.art} in ('aufstieg', 'abstieg')`)
	]
);

// Wann ein Wettbewerb einer Saison zuletzt vollständig abgerufen wurde.
export const icStand = pgTable(
	'ic_stand',
	{
		saison: integer('saison').notNull(),
		wettbewerb: text('wettbewerb').$type<'ic' | 'jic'>().notNull(),
		abgerufenAm: timestamp('abgerufen_am', { withTimezone: true }).notNull()
	},
	(t) => [
		primaryKey({ columns: [t.saison, t.wettbewerb] }),
		check('ic_stand_wettbewerb_check', sql`${t.wettbewerb} in ('ic', 'jic')`)
	]
);

// Spielbericht einer gespielten Begegnung eines TCO-Teams (Gruppe oder Auf-/Abstieg). Fehlt die Zeile,
// hat Swiss Tennis noch keine Einzelpartien. Sätze und Games aus TCO-Sicht.
export const icBericht = pgTable(
	'ic_bericht',
	{
		saison: integer('saison').notNull(),
		teamId: integer('team_id').notNull(),
		begegnungId: integer('begegnung_id').notNull(),
		tcoHeim: boolean('tco_heim').notNull(),
		tcoSaetze: integer('tco_saetze').notNull(),
		gegnerSaetze: integer('gegner_saetze').notNull(),
		tcoGames: integer('tco_games').notNull(),
		gegnerGames: integer('gegner_games').notNull()
	},
	(t) => [
		primaryKey({ columns: [t.saison, t.teamId, t.begegnungId] }),
		foreignKey({
			columns: [t.saison, t.teamId],
			foreignColumns: [icTeam.saison, icTeam.teamId]
		}).onDelete('cascade')
	]
);

// Einzelpartie eines Berichts; Sätze aus TCO-Sicht («7:5» = TCO 7), nur gespielte.
export const icPartie = pgTable(
	'ic_partie',
	{
		saison: integer('saison').notNull(),
		teamId: integer('team_id').notNull(),
		begegnungId: integer('begegnung_id').notNull(),
		art: text('art').$type<'einzel' | 'doppel'>().notNull(),
		position: integer('position').notNull(),
		saetze: text('saetze').array().notNull(),
		aufgabe: text('aufgabe').$type<'tco' | 'gegner'>()
	},
	(t) => [
		primaryKey({ columns: [t.saison, t.teamId, t.begegnungId, t.art, t.position] }),
		foreignKey({
			name: 'ic_partie_bericht_fk',
			columns: [t.saison, t.teamId, t.begegnungId],
			foreignColumns: [icBericht.saison, icBericht.teamId, icBericht.begegnungId]
		}).onDelete('cascade'),
		check('ic_partie_art_check', sql`${t.art} in ('einzel', 'doppel')`),
		check('ic_partie_aufgabe_check', sql`${t.aufgabe} in ('tco', 'gegner')`)
	]
);

// Spieler einer Partie, je Seite. `stId` und `rangliste` (Nummern von Swiss Tennis, für spätere
// Verläufe) nur bei TCO-Spielern; die Oberfläche bekommt sie nicht. Von Gegnern nur Name und Klassierung.
export const icSpieler = pgTable(
	'ic_spieler',
	{
		saison: integer('saison').notNull(),
		teamId: integer('team_id').notNull(),
		begegnungId: integer('begegnung_id').notNull(),
		art: text('art').$type<'einzel' | 'doppel'>().notNull(),
		position: integer('position').notNull(),
		seite: text('seite').$type<'tco' | 'gegner'>().notNull(),
		nr: integer('nr').notNull(),
		stId: integer('st_id'),
		name: text('name').notNull(),
		klassierung: text('klassierung').notNull(),
		rangliste: integer('rangliste')
	},
	(t) => [
		primaryKey({ columns: [t.saison, t.teamId, t.begegnungId, t.art, t.position, t.seite, t.nr] }),
		foreignKey({
			name: 'ic_spieler_partie_fk',
			columns: [t.saison, t.teamId, t.begegnungId, t.art, t.position],
			foreignColumns: [
				icPartie.saison,
				icPartie.teamId,
				icPartie.begegnungId,
				icPartie.art,
				icPartie.position
			]
		}).onDelete('cascade'),
		check('ic_spieler_nr_check', sql`${t.nr} in (1, 2)`),
		check(
			'ic_spieler_nummern_check',
			sql`(${t.seite} = 'tco' and ${t.stId} is not null and ${t.rangliste} is not null) or (${t.seite} = 'gegner' and ${t.stId} is null and ${t.rangliste} is null)`
		)
	]
);
