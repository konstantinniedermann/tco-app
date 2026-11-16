// Schnittstellen der Mitglieder zur Clubmeisterschaft (A-ANMELDUNG-01…05, A-ANMELDUNG-10). Alles
// nur mit Sitzung.
import { ABLEHNUNGEN } from '../../cm/ablehnung.ts';
import { INTEGER_MAX, parseId } from '../parse-id.ts';
import { aendernd, antwort, jetzt, leseKoerper, mitSitzung, nichtGefunden } from '../http.ts';
import type { AngemeldetesKonto } from '../login/sitzung.ts';
import { cmAdmins } from '../mitteilung/meldung.ts';
import { trageCmAngabenNach } from './angaben.ts';
import {
	beantrageWildcard,
	eigeneKategorien,
	ladeCmAnsicht,
	laufendeTurniere,
	meldeAb,
	meldeAn
} from './anmeldungen.ts';
import {
	lehneAnfrageAb,
	nimmAnfrageAn,
	setzeSuchtext,
	stelleAnfrage,
	sucheDoppelPartner,
	zieheAnfrageZurueck
} from './doppel.ts';
import {
	abgelehntMeldung,
	abgemeldetMeldung,
	anfrageMeldung,
	angenommenMeldung,
	hinfaelligMeldung
} from './doppel-meldung.ts';
import {
	bezugDerAnfrage,
	bezugDerAnmeldung,
	bezugDerKategorie,
	mitgliedEmail,
	mitgliedName,
	type Bezug
} from './bezug.ts';
import type { BestaetigungInhalt } from './mail.ts';
import type { CmDienste, CmEreignis } from './typen.ts';

export function getCmTurniere(d: CmDienste, e: CmEreignis): Promise<Response> {
	return mitSitzung(e, async (konto) =>
		antwort(200, await laufendeTurniere(d.db, konto.mitgliedId, jetzt(d)))
	);
}

export function getCmAnsicht(d: CmDienste, e: CmEreignis): Promise<Response> {
	return mitSitzung(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const a = await ladeCmAnsicht(d.db, id, konto.mitgliedId, jetzt(d));
		return a ? antwort(200, a) : nichtGefunden();
	});
}

export function postCmAngaben(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const r = await trageCmAngabenNach(d.db, konto.mitgliedId, await leseKoerper(e), jetzt(d));
		switch (r.ergebnis) {
			case 'ok':
				return antwort(200, {});
			case 'eingabe':
				return antwort(400, { fehler: 'eingabe', felder: r.felder });
			case 'nicht-gefunden':
				return nichtGefunden();
		}
	});
}

/** Alles, was eine Schreibfunktion statt `ok` ablehnen kann (ohne `nicht-gefunden`, das ist 404). */
type Ablehnung = Exclude<
	| Awaited<ReturnType<typeof meldeAn>>
	| Awaited<ReturnType<typeof beantrageWildcard>>
	| Awaited<ReturnType<typeof stelleAnfrage>>
	| Exclude<Awaited<ReturnType<typeof lehneAnfrageAb>>, { vonId: number }>
	| Exclude<Awaited<ReturnType<typeof zieheAnfrageZurueck>>, 'ok'>
	| Exclude<Awaited<ReturnType<typeof nimmAnfrageAn>>, { ergebnis: 'ok' }>,
	'ok' | 'nicht-gefunden'
>;

/** Die Liste teilt der Server mit der Oberfläche (`src/lib/cm/ablehnung.ts`, N-10). */
const FEHLER = ABLEHNUNGEN satisfies readonly Ablehnung[];

const istAbgelehnt = (r: string): r is (typeof FEHLER)[number] =>
	(FEHLER as readonly string[]).includes(r);

/** 409 mit dem Grund; was die Liste nicht kennt, gilt als `geschlossen`. */
const ablehnung = (r: string) => antwort(409, { fehler: istAbgelehnt(r) ? r : 'geschlossen' });

/** FR-08: Höchstlänge des Wildcard-Kommentars (nach `trim`). */
const KOMMENTAR_MAX = 300;

/** FR-49: Höchstlänge des Suchtexts (nach `trim`); so lang ist auch die Spalte. */
const SUCHTEXT_MAX = 120;

/**
 * FR-49: Suchtext aus dem Körper. Kein Text oder nur Leerraum ist «keiner» (`null`), zu lang ist
 * eine 400-Antwort.
 */
function leseSuchtext(roh: unknown): string | null | Response {
	const text = typeof roh === 'string' ? roh.trim() : '';
	if (text.length > SUCHTEXT_MAX) {
		return antwort(400, {
			fehler: 'eingabe',
			felder: { suchtext: `Höchstens ${SUCHTEXT_MAX} Zeichen.` }
		});
	}
	return text === '' ? null : text;
}

// Nach dem Speichern: neue Ansicht und, erst danach, die Bestätigung (wirft nie).
async function antwortMitMail(
	d: CmDienste,
	konto: AngemeldetesKonto,
	bezug: Bezug,
	aktion: BestaetigungInhalt['aktion'] | null,
	t: Date
): Promise<Response> {
	const ansicht = await ladeCmAnsicht(d.db, bezug.turnierId, konto.mitgliedId, t);
	// Das Turnier kann zwischen Speichern und Lesen verschwunden sein; die Änderung gilt trotzdem.
	if (!ansicht) return nichtGefunden();
	const an = aktion && (await mitgliedEmail(d.db, konto.mitgliedId));
	if (an && aktion) {
		await d.bestaetigung(an, {
			turniername: ansicht.turnier.name,
			aktion,
			kategorie: bezug.kategorie,
			eigene: await eigeneKategorien(d.db, bezug.turnierId, konto.mitgliedId),
			anmeldeschluss: ansicht.turnier.anmeldeschluss
		});
	}
	return antwort(200, ansicht);
}

export function postCmAnmeldung(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const suchtext = leseSuchtext((await leseKoerper(e)).suchtext);
		if (suchtext instanceof Response) return suchtext;
		const bezug = await bezugDerKategorie(d.db, id);
		if (!bezug) return nichtGefunden();
		const t = jetzt(d);
		const r = await meldeAn(d.db, id, konto.mitgliedId, t, suchtext);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r !== 'ok') return ablehnung(r);
		return antwortMitMail(d, konto, bezug, 'an', t);
	});
}

export function postCmAbmeldung(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const bezug = await bezugDerAnmeldung(d.db, id, konto.mitgliedId);
		if (!bezug) return nichtGefunden();
		const t = jetzt(d);
		const r = await meldeAb(d.db, id, konto.mitgliedId, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'geschlossen') return antwort(409, { fehler: 'geschlossen' });
		const a = await antwortMitMail(d, konto, bezug, 'ab', t);
		if (r.partnerId !== null) {
			const wer = await mitgliedName(d.db, konto.mitgliedId);
			// Die Antwort wartet nicht auf Push und Mail an den Partner.
			void meldeMitgliedern(
				d,
				[r.partnerId],
				abgemeldetMeldung(wer ?? 'Dein Partner', bezug.kategorie, bezug.turnierId)
			);
		}
		return a;
	});
}

/**
 * FR-47: Meldung an die CM-Admins ausser dem Antragsteller selbst. Wirft nie und loggt nichts
 * (SI-05): Der Antrag ist schon gespeichert.
 */
async function meldeCmAdmins(
	d: CmDienste,
	ohne: number,
	m: Parameters<CmDienste['melde']>[1]
): Promise<void> {
	try {
		await d.melde(
			(await cmAdmins(d.db)).filter((id) => id !== ohne),
			m
		);
	} catch {
		// Bewusst leer: kein Log, kein Fehler an den Antragsteller.
	}
}

/**
 * FR-47: Meldung an Mitglieder, jedes nur einmal. Wirft nie und loggt nichts (SI-05): was
 * geändert werden sollte, ist schon gespeichert.
 */
async function meldeMitgliedern(
	d: CmDienste,
	ids: number[],
	m: Parameters<CmDienste['melde']>[1]
): Promise<void> {
	const einmalig = [...new Set(ids)];
	if (einmalig.length === 0) return;
	try {
		await d.melde(einmalig, m);
	} catch {
		// Bewusst leer: kein Log, kein Fehler an den Handelnden.
	}
}

/**
 * A-ANMELDUNG-10, FR-08: Wildcard-Antrag mit Pflichtkommentar. Danach die Bestätigung an den
 * Spieler und eine Meldung an die CM-Admins (FR-47), DS-05: ohne Namen des Spielers.
 */
export function postCmWildcard(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const roh = (await leseKoerper(e)).kommentar;
		const kommentar = typeof roh === 'string' ? roh.trim() : '';
		if (kommentar.length === 0 || kommentar.length > KOMMENTAR_MAX) {
			return antwort(400, {
				fehler: 'eingabe',
				felder: {
					kommentar:
						kommentar.length === 0
							? 'Bitte schreib kurz, warum du hier spielen möchtest.'
							: `Höchstens ${KOMMENTAR_MAX} Zeichen.`
				}
			});
		}
		const bezug = await bezugDerKategorie(d.db, id);
		if (!bezug) return nichtGefunden();
		const t = jetzt(d);
		const r = await beantrageWildcard(d.db, id, konto.mitgliedId, kommentar, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r !== 'ok') return ablehnung(r);
		const a = await antwortMitMail(d, konto, bezug, 'antrag', t);
		// Die Antwort wartet nicht auf Push und Mail an die CM-Admins; `meldeCmAdmins` wirft nie.
		void meldeCmAdmins(d, konto.mitgliedId, {
			titel: 'Wildcard-Antrag',
			text: `Neuer Wildcard-Antrag für «${bezug.kategorie}».`,
			pfad: `/verwaltung/turniere/${bezug.turnierId}/kategorien/${id}`
		});
		return a;
	});
}

/** FR-48: Partnersuche in einer Doppel-Kategorie; die Antwort sind nur die Treffer. */
export function getCmPartner(d: CmDienste, e: CmEreignis): Promise<Response> {
	return mitSitzung(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const text = e.url.searchParams.get('suche') ?? '';
		return antwort(200, await sucheDoppelPartner(d.db, id, konto.mitgliedId, text, jetzt(d)));
	});
}

/** Nummer eines Mitglieds aus dem Körper; alles andere ist keine. */
const mitgliedIdAus = (roh: unknown) =>
	typeof roh === 'number' && Number.isSafeInteger(roh) && roh > 0 && roh <= INTEGER_MAX
		? roh
		: null;

/**
 * FR-48, FR-47: Anfrage an einen Partner. Danach eine Meldung an den Angefragten; keine
 * Bestätigungsmail.
 */
export function postCmAnfrage(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		const anId = mitgliedIdAus((await leseKoerper(e)).anId);
		if (id === null || anId === null) return nichtGefunden();
		const bezug = await bezugDerKategorie(d.db, id);
		if (!bezug) return nichtGefunden();
		const t = jetzt(d);
		const r = await stelleAnfrage(d.db, id, konto.mitgliedId, anId, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r !== 'ok') return ablehnung(r);
		const von = await mitgliedName(d.db, konto.mitgliedId);
		void meldeMitgliedern(
			d,
			[anId],
			anfrageMeldung(von ?? 'Ein Mitglied', bezug.kategorie, bezug.turnierId)
		);
		return antwortMitMail(d, konto, bezug, null, t);
	});
}

/**
 * FR-48, FR-47: annehmen. Bestätigungsmail an den, der annimmt; Meldung an den Anfragenden und an
 * Dritte, deren Anfrage dadurch hinfällig wird.
 */
export function postCmAnfrageAnnehmen(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const t = jetzt(d);
		const r = await nimmAnfrageAn(d.db, id, konto.mitgliedId, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (typeof r === 'string') return ablehnung(r);
		const bezug = { turnierId: r.turnierId, kategorie: r.kategorie };
		const a = await antwortMitMail(d, konto, bezug, 'an', t);
		const an = await mitgliedName(d.db, konto.mitgliedId);
		void meldeMitgliedern(
			d,
			[r.vonId],
			angenommenMeldung(an ?? 'Dein Partner', r.kategorie, r.turnierId)
		);
		for (const h of r.hinfaellig) {
			void meldeMitgliedern(d, h.anIds, hinfaelligMeldung(h.mitName, r.kategorie, r.turnierId));
		}
		return a;
	});
}

/** FR-48, FR-47: ablehnen, ohne Grund; Meldung an den Anfragenden, keine Bestätigungsmail. */
export function postCmAnfrageAblehnen(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const t = jetzt(d);
		const r = await lehneAnfrageAb(d.db, id, konto.mitgliedId, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (typeof r === 'string') return ablehnung(r);
		const an = await mitgliedName(d.db, konto.mitgliedId);
		void meldeMitgliedern(
			d,
			[r.vonId],
			abgelehntMeldung(an ?? 'Dein Partner', r.kategorie, r.turnierId)
		);
		return antwortMitMail(d, konto, r, null, t);
	});
}

/** FR-48: eine eigene Anfrage zurückziehen; weder Meldung noch Bestätigungsmail. */
export function postCmAnfrageZurueck(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		// Vor dem Löschen lesen, sonst ist die Kategorie für die Ansicht nicht mehr zu finden.
		const bezug = await bezugDerAnfrage(d.db, id, konto.mitgliedId);
		if (!bezug) return nichtGefunden();
		const t = jetzt(d);
		const r = await zieheAnfrageZurueck(d.db, id, konto.mitgliedId, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r !== 'ok') return ablehnung(r);
		return antwortMitMail(d, konto, bezug, null, t);
	});
}

/** FR-49: Suchtext der eigenen Anmeldung ändern; leer löscht ihn. */
export function postCmSuchtext(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const suchtext = leseSuchtext((await leseKoerper(e)).suchtext);
		if (suchtext instanceof Response) return suchtext;
		const bezug = await bezugDerAnmeldung(d.db, id, konto.mitgliedId);
		if (!bezug) return nichtGefunden();
		const t = jetzt(d);
		const r = await setzeSuchtext(d.db, id, konto.mitgliedId, suchtext, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r !== 'ok') return ablehnung(r);
		return antwortMitMail(d, konto, bezug, null, t);
	});
}

// Alle Schnittstellen der Mitglieder zur Clubmeisterschaft; die Grundprüfung
// (`src/lib/server/grundpruefung.db.test.ts`) läuft über jeden Eintrag.
export const CM_SCHNITTSTELLEN = {
	getCmTurniere,
	getCmAnsicht,
	postCmAngaben,
	postCmAnmeldung,
	postCmAbmeldung,
	postCmWildcard,
	getCmPartner,
	postCmAnfrage,
	postCmAnfrageAnnehmen,
	postCmAnfrageAblehnen,
	postCmAnfrageZurueck,
	postCmSuchtext
} satisfies Record<string, (d: CmDienste, e: CmEreignis) => Promise<Response>>;
