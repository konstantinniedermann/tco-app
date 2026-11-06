import { describe, expect, it } from 'vitest';
import {
	AUSWAHL_NAMEN,
	WEG_NAMEN,
	WEGE,
	auswahlText,
	ladeMitteilungen,
	rueckfrageText,
	sendeMitteilung,
	vorschauZeilen,
	zahlenText,
	zeigeVorschau,
	type MitteilungWerte
} from './mitteilung-api.ts';

type Aufruf = { pfad: string; init: RequestInit };

function holer(antwort: Response | Error) {
	const aufrufe: Aufruf[] = [];
	const holen = async (pfad: string, init: RequestInit) => {
		aufrufe.push({ pfad, init });
		if (antwort instanceof Error) throw antwort;
		return antwort;
	};
	return { aufrufe, holen };
}

const json = (status: number, inhalt: unknown) => Response.json(inhalt, { status });

const WERTE: MitteilungWerte = {
	titel: 'Erinnerung: GV',
	text: 'Bitte melde dich an.',
	auswahl: 'keine-antwort',
	weg: 'push-sonst-mail'
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
			json(200, { anzahl: 1, push: 0, mails: 1, nichtErreichbar: 0, namen: ['Muster, Hanna'] })
		);
		expect(await zeigeVorschau({ art: 'anlass', anlassId: 7 }, WERTE, vorschau.holen)).toEqual({
			art: 'ok',
			daten: { anzahl: 1, push: 0, mails: 1, nichtErreichbar: 0, namen: ['Muster, Hanna'] }
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
		expect(JSON.parse(String(s.init.body))).toEqual(WERTE);
	});

	it('FR-42: Eingabefehler kommen je Feld als Satz an, andere Antworten unverändert', async () => {
		const falsch = holer(json(400, { fehler: 'eingabe', felder: ['titel', 'text'] }));
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
		expect(zahlenText({ push: 12, mails: 25, ersatzMails: 0, nichtErreichbar: 0 })).toBe(
			'12 per Push, 25 per E-Mail'
		);
		expect(zahlenText({ push: 12, mails: 25, ersatzMails: 1, nichtErreichbar: 2 })).toBe(
			'12 per Push, 25 per E-Mail, 1 ersatzweise per E-Mail, nicht erreichbar: 2'
		);
	});
});
