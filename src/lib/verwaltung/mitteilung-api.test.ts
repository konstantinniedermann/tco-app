import { describe, expect, it } from 'vitest';
import { TURNIER_AUSWAHLEN, VEREIN_AUSWAHLEN } from '../mitteilung/auswahl.ts';
import { FELD_MELDUNG } from '../mitteilung/vorlagen.ts';
import {
	AUSWAHL_NAMEN,
	TURNIER_NAMEN,
	VEREIN_NAMEN,
	WEG_NAMEN,
	WEGE,
	auswahlText,
	gleicheWerte,
	ladeMitteilungen,
	empfaengerText,
	rueckfrageText,
	sendeMitteilung,
	vorschauZeilen,
	zahlenText,
	zeigeVorschau,
	type MitteilungWerte
} from './mitteilung-api.ts';
import { holer, json } from '../../../tests/hilfen/abruf.ts';

const WERTE: MitteilungWerte = {
	titel: 'Erinnerung: GV',
	text: 'Bitte melde dich an.',
	auswahl: 'keine-antwort',
	weg: 'push-sonst-mail',
	kategorieId: null
};
// Ohne Kategorie: so geht der Körper an Anlass und Verein.
const KOERPER = {
	titel: WERTE.titel,
	text: WERTE.text,
	auswahl: WERTE.auswahl,
	weg: WERTE.weg
};

describe('Mitteilungen in der Verwaltung: Anfragen', () => {
	it('FR-42: Anlass und Verein lesen ihre eigene Schnittstelle', async () => {
		const daten = { vorlagen: [], verlauf: [] };
		const anlass = holer(json(200, daten));
		expect(await ladeMitteilungen({ art: 'anlass', anlassId: 7 }, anlass.holen)).toEqual({
			art: 'ok',
			daten
		});
		const verein = holer(json(200, daten));
		await ladeMitteilungen({ art: 'verein' }, verein.holen);
		expect([anlass.aufrufe[0].pfad, verein.aufrufe[0].pfad]).toEqual([
			'/api/admin/anlaesse/7/mitteilungen',
			'/api/admin/mitteilungen'
		]);
		expect(anlass.aufrufe[0].init.method).toBe('GET');
	});

	it('FR-43: Vorschau und Senden schicken die Werte als JSON an den Bezug', async () => {
		const vorschau = holer(
			json(200, {
				anzahl: 1,
				push: 0,
				mails: 1,
				nichtErreichbar: 0,
				namen: [{ rufname: null, vorname: 'Hanna', nachname: 'Muster' }]
			})
		);
		expect(await zeigeVorschau({ art: 'anlass', anlassId: 7 }, WERTE, vorschau.holen)).toEqual({
			art: 'ok',
			daten: {
				anzahl: 1,
				push: 0,
				mails: 1,
				nichtErreichbar: 0,
				namen: [{ rufname: null, vorname: 'Hanna', nachname: 'Muster' }]
			}
		});
		const senden = holer(json(201, { push: 0, mails: 1, ersatzMails: 0, nichtErreichbar: 0 }));
		expect((await sendeMitteilung({ art: 'verein' }, WERTE, senden.holen)).art).toBe('ok');
		const [v] = vorschau.aufrufe;
		const [s] = senden.aufrufe;
		expect([v.pfad, s.pfad]).toEqual([
			'/api/admin/anlaesse/7/mitteilungen/vorschau',
			'/api/admin/mitteilungen/senden'
		]);
		expect(v.init.method).toBe('POST');
		expect(new Headers(v.init.headers).get('content-type')).toBe('application/json');
		expect(JSON.parse(String(s.init.body))).toEqual(KOERPER);
	});

	it('Spec A6: Turnier liest und schickt an seine Schnittstelle, mit der Kategorie im Körper', async () => {
		const daten = { vorlagen: [], verlauf: [], kategorien: [] };
		const lesen = holer(json(200, daten));
		expect(await ladeMitteilungen({ art: 'turnier', turnierId: 4 }, lesen.holen)).toEqual({
			art: 'ok',
			daten
		});
		const werte = { ...WERTE, auswahl: 'angemeldet', kategorieId: 9 };
		const vorschau = holer(
			json(200, { anzahl: 0, push: 0, mails: 0, nichtErreichbar: 0, namen: [] })
		);
		await zeigeVorschau({ art: 'turnier', turnierId: 4 }, werte, vorschau.holen);
		const senden = holer(json(201, { push: 0, mails: 0, ersatzMails: 0, nichtErreichbar: 0 }));
		await sendeMitteilung(
			{ art: 'turnier', turnierId: 4 },
			{ ...werte, kategorieId: null },
			senden.holen
		);
		expect([lesen.aufrufe[0].pfad, vorschau.aufrufe[0].pfad, senden.aufrufe[0].pfad]).toEqual([
			'/api/admin/turniere/4/mitteilungen',
			'/api/admin/turniere/4/mitteilungen/vorschau',
			'/api/admin/turniere/4/mitteilungen/senden'
		]);
		expect(JSON.parse(String(vorschau.aufrufe[0].init.body))).toEqual(werte);
		expect(JSON.parse(String(senden.aufrufe[0].init.body))).toEqual({
			...werte,
			kategorieId: null
		});
	});

	it('Spec A6: Anlass und Verein bekommen keine Kategorie mit', async () => {
		const anlass = holer(
			json(200, { anzahl: 0, push: 0, mails: 0, nichtErreichbar: 0, namen: [] })
		);
		await zeigeVorschau({ art: 'anlass', anlassId: 7 }, { ...WERTE, kategorieId: 9 }, anlass.holen);
		expect(JSON.parse(String(anlass.aufrufe[0].init.body))).toEqual(KOERPER);
	});

	it('FR-42: Eingabefehler kommen je Feld als Satz an, andere Antworten unverändert', async () => {
		const falsch = holer(
			json(400, {
				fehler: 'eingabe',
				felder: { titel: FELD_MELDUNG.titel, text: FELD_MELDUNG.text }
			})
		);
		expect(await zeigeVorschau({ art: 'verein' }, WERTE, falsch.holen)).toEqual({
			art: 'eingabe',
			felder: {
				titel: 'Bitte einen Titel mit höchstens 50 Zeichen angeben.',
				text: 'Bitte einen Text mit höchstens 200 Zeichen angeben.'
			}
		});
		const recht = holer(json(403, { fehler: 'kein-recht' }));
		expect(await sendeMitteilung({ art: 'verein' }, WERTE, recht.holen)).toEqual({
			art: 'kein-recht'
		});
		const weg = holer(new Error('Netz weg'));
		expect(await sendeMitteilung({ art: 'verein' }, WERTE, weg.holen)).toEqual({
			art: 'stoerung'
		});
	});

	// Rand, den der gemeinsame Abruf-Baustein genau so erhalten muss (Charakterisierung vor Schritt 13).
	it('FR-42: 409 veraltet beim Senden kommt als eigenes Ergebnis an', async () => {
		const v = holer(json(409, { fehler: 'veraltet' }));
		expect(await sendeMitteilung({ art: 'verein' }, WERTE, v.holen)).toEqual({ art: 'veraltet' });
		expect(v.aufrufe[0].pfad).toBe('/api/admin/mitteilungen/senden');
	});
});

describe('Mitteilungen in der Verwaltung: Texte', () => {
	it('FR-43: Empfänger und Weg in Worten, nie als Schlüssel', () => {
		expect(AUSWAHL_NAMEN).toEqual({
			alle: 'Alle aktiven Mitglieder',
			'keine-antwort': 'Noch keine Antwort',
			kommt: 'Kommen',
			'kommt-nicht': 'Kommen nicht',
			'zu-pruefen': 'Antwort zu prüfen (Termin geändert)'
		});
		expect(WEGE).toEqual(['push', 'push-sonst-mail', 'push-und-mail']);
		expect(WEGE.map((w) => WEG_NAMEN[w])).toEqual([
			'Nur Push',
			'Push, sonst E-Mail',
			'Push und E-Mail an alle'
		]);
		expect(auswahlText('kommt-nicht')).toBe('Kommen nicht');
		expect(auswahlText('unbekannt')).toBe('unbekannt');
	});

	it('Spec A7, B13: Auswahl zum Turnier mit Kategorie, an eine Rolle mit ihrem Namen', () => {
		expect(auswahlText('angemeldet', 'Damen R7–R9')).toBe('Angemeldet · Damen R7–R9');
		expect(auswahlText('berechtigt', null)).toBe(
			'Spielberechtigt, noch nicht angemeldet · alle Kategorien'
		);
		expect(auswahlText('sucht-partner')).toBe('Doppel: sucht Partner · alle Kategorien');
		expect(auswahlText('alle')).toBe('Alle aktiven Mitglieder');
		expect(auswahlText('rolle-cm')).toBe('Alle mit Rolle CM-Admin');
		expect(auswahlText('rolle-mytco')).toBe('Alle mit Rolle MyTCO-Admin');
		expect(auswahlText('rolle-mitglieder')).toBe('Alle mit Rolle Mitglieder-Admin');
		expect(auswahlText('rolle-lizenz')).toBe('Alle mit Rolle Lizenz-Admin');
		expect(auswahlText('kommt')).toBe('Kommen');
		expect(TURNIER_AUSWAHLEN.map((a) => TURNIER_NAMEN[a])).toEqual([
			'Alle aktiven Mitglieder',
			'Angemeldet',
			'Spielberechtigt, noch nicht angemeldet',
			'Doppel: sucht Partner'
		]);
		expect(VEREIN_AUSWAHLEN.map((a) => VEREIN_NAMEN[a])).toEqual([
			'Alle aktiven Mitglieder',
			'Alle mit Rolle MyTCO-Admin',
			'Alle mit Rolle Mitglieder-Admin',
			'Alle mit Rolle CM-Admin',
			'Alle mit Rolle Lizenz-Admin'
		]);
	});

	it('FR-43: Vorschau nennt Zahl, Push und E-Mail; nicht erreichbar nur, wenn es welche gibt', () => {
		const v = { anzahl: 37, push: 12, mails: 25, nichtErreichbar: 0 };
		expect(vorschauZeilen(v, 'push-sonst-mail')).toEqual([
			'37 Mitglieder: 12 per Push, 25 per E-Mail'
		]);
		expect(vorschauZeilen({ ...v, mails: 23, nichtErreichbar: 2 }, 'push-sonst-mail')).toEqual([
			'37 Mitglieder: 12 per Push, 23 per E-Mail',
			'nicht erreichbar: 2'
		]);
		expect(vorschauZeilen({ anzahl: 1, push: 0, mails: 1, nichtErreichbar: 0 }, 'push')).toEqual([
			'1 Mitglied: 0 per Push, 1 per E-Mail'
		]);
	});

	it('FR-43: Weg «an alle»: wer Push hat, bekommt beides (Spec Ziel 11)', () => {
		// 37 Mitglieder: 12 mit Push und Adresse, 23 nur mit Adresse, 2 ohne beides.
		expect(
			vorschauZeilen({ anzahl: 37, push: 12, mails: 35, nichtErreichbar: 2 }, 'push-und-mail')
		).toEqual(['37 Mitglieder: 12 per Push und E-Mail, 23 nur per E-Mail', 'nicht erreichbar: 2']);
		// Eines hat Push, aber keine Adresse.
		expect(
			vorschauZeilen({ anzahl: 5, push: 2, mails: 4, nichtErreichbar: 0 }, 'push-und-mail')
		).toEqual(['5 Mitglieder: 1 per Push und E-Mail, 3 nur per E-Mail, 1 nur per Push']);
	});

	it('FR-42: Rückfrage und Zahlen nach dem Senden', () => {
		expect(rueckfrageText(37)).toBe('Jetzt an 37 Mitglieder senden?');
		expect(rueckfrageText(1)).toBe('Jetzt an 1 Mitglied senden?');
	});

	it('Spec A7: Rückfrage nennt die Empfänger der gesendeten Werte in Worten', () => {
		const kategorien = [
			{ id: 9, name: 'Herren R7–R9' },
			{ id: 10, name: 'Mixed Doppel' }
		];
		expect(empfaengerText({ ...WERTE, auswahl: 'angemeldet', kategorieId: 9 }, kategorien)).toBe(
			'An: Angemeldet · Herren R7–R9'
		);
		expect(empfaengerText({ ...WERTE, auswahl: 'berechtigt' }, kategorien)).toBe(
			'An: Spielberechtigt, noch nicht angemeldet · alle Kategorien'
		);
		expect(empfaengerText({ ...WERTE, auswahl: 'kommt' })).toBe('An: Kommen');
		expect(empfaengerText({ ...WERTE, auswahl: 'rolle-lizenz' })).toBe(
			'An: Alle mit Rolle Lizenz-Admin'
		);
		expect(empfaengerText({ ...WERTE, auswahl: 'alle' })).toBe('An: Alle aktiven Mitglieder');
		expect(zahlenText({ push: 12, mails: 25, ersatzMails: 0, nichtErreichbar: 0 })).toBe(
			'12 per Push, 25 per E-Mail'
		);
		expect(zahlenText({ push: 12, mails: 25, ersatzMails: 1, nichtErreichbar: 2 })).toBe(
			'12 per Push, 25 per E-Mail, 1 ersatzweise per E-Mail, nicht erreichbar: 2'
		);
	});
});

describe('Mitteilungen in der Verwaltung: Vorschau gilt nur für ihre Werte', () => {
	it('FR-43: jede Abweichung in Titel, Text, Auswahl, Kategorie oder Weg macht die Vorschau ungültig', () => {
		expect(gleicheWerte(WERTE, { ...WERTE })).toBe(true);
		expect(gleicheWerte(WERTE, { ...WERTE, titel: 'Erinnerung: GV!' })).toBe(false);
		expect(gleicheWerte(WERTE, { ...WERTE, text: 'Bitte melde dich an' })).toBe(false);
		expect(gleicheWerte(WERTE, { ...WERTE, auswahl: 'kommt' })).toBe(false);
		expect(gleicheWerte(WERTE, { ...WERTE, weg: 'push' })).toBe(false);
		expect(gleicheWerte(WERTE, { ...WERTE, kategorieId: 3 })).toBe(false);
		expect(gleicheWerte({ ...WERTE, kategorieId: 3 }, { ...WERTE, kategorieId: 3 })).toBe(true);
		expect(gleicheWerte(null, WERTE)).toBe(false);
	});
});
