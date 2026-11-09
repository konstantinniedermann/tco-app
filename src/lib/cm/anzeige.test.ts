import { describe, expect, test } from 'vitest';
import type { KategorieRegel } from '../turnier/passung.ts';
import {
	ANNEHMEN_HINWEIS,
	anmeldungenText,
	doppelText,
	kontaktFragenText,
	kategorieText,
	kommentarZaehlerText,
	namenText,
	paareText,
	rueckfrageText,
	standPlakette,
	standText,
	suchendeText,
	SUCHTEXT_MAX,
	suchtextZaehlerText,
	waehlbar,
	vermerkText,
	weiterePaare
} from './anzeige.ts';

const regel = (k: Partial<KategorieRegel> = {}): KategorieRegel => ({
	art: 'einzel',
	geschlecht: 'herren',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: null,
	klassierungBis: null,
	mindestsumme: null,
	...k
});

describe('Anzeige der Clubmeisterschaft für Mitglieder', () => {
	test('A-ANMELDUNG-02: Stand als Text', () => {
		expect(standText(0)).toBe('Noch keine Anmeldung');
		expect(standText(1)).toBe('1 Anmeldung');
		expect(standText(2)).toBe('2 Anmeldungen');
		expect(standText(3)).toBe('3 Anmeldungen');
	});

	test('FR-07: Kategorie als Kurztext ohne leere Teile', () => {
		expect(
			kategorieText(regel({ jahrgangVon: 2009, klassierungVon: 'R1', klassierungBis: 'R6' }))
		).toBe('Herren · R1–R6 · ab Jahrgang 2009');
		expect(kategorieText(regel({ geschlecht: 'damen' }))).toBe('Damen');
		expect(kategorieText(regel({ geschlecht: 'offen', jahrgangBis: 1976 }))).toBe(
			'bis Jahrgang 1976'
		);
		expect(
			kategorieText(regel({ geschlecht: 'offen', klassierungVon: 'R1', klassierungBis: 'R9' }))
		).toBe('R1–R9');
		expect(
			kategorieText(
				regel({
					jahrgangVon: 1980,
					jahrgangBis: 1989,
					klassierungVon: 'R7',
					klassierungBis: 'R9'
				})
			)
		).toBe('Herren · R7–R9 · Jahrgang 1980–1989');
	});

	test('A-ANMELDUNG-01: Namen der Angemeldeten', () => {
		expect(namenText([])).toBe('Noch niemand angemeldet.');
		expect(namenText([{ rufname: null, vorname: 'Anna', nachname: 'Beispiel' }])).toBe(
			'Angemeldet (1): Anna Beispiel'
		);
	});

	test('namenText mit Rufname', () => {
		expect(
			namenText([
				{ rufname: null, vorname: 'Anna', nachname: 'Muster' },
				{ rufname: 'Hannes', vorname: 'Johannes', nachname: 'Beispiel' }
			])
		).toBe('Angemeldet (2): Anna Muster, Hannes (Johannes Beispiel)');
	});

	test('FR-08: Zähler des Wildcard-Kommentars', () => {
		expect(kommentarZaehlerText(0)).toBe('0 von 300 Zeichen');
		expect(kommentarZaehlerText(12)).toBe('12 von 300 Zeichen');
	});

	test('A-ANMELDUNG-02: Stand nennt offene Anfragen an einen', () => {
		expect(standText(2, 1)).toBe('2 Anmeldungen · 1 Anfrage');
		expect(standText(0, 2)).toBe('Noch keine Anmeldung · 2 Anfragen');
		expect(standText(1, 0)).toBe('1 Anmeldung');
	});

	test('A-ANMELDUNG-04: Doppel als Kurztext, ohne leere Teile', () => {
		expect(doppelText(regel({ art: 'doppel', geschlecht: 'mixed', mindestsumme: 9 }))).toBe(
			'Doppel · Mixed · zusammen mind. 9'
		);
		expect(doppelText(regel({ art: 'doppel', geschlecht: 'damen' }))).toBe('Doppel · Damen');
		expect(doppelText(regel({ art: 'doppel', geschlecht: 'offen', mindestsumme: 0 }))).toBe(
			'Doppel · zusammen mind. 0'
		);
	});

	test('FR-48: Vermerk in der Partnersuche als Text', () => {
		expect(vermerkText('klassierung-fehlt')).toBe('Klassierung fehlt');
		expect(vermerkText('angaben-fehlen')).toBe('Angaben fehlen');
	});

	test('FR-49: Zähler des Kommentars «sucht Partner»', () => {
		expect(SUCHTEXT_MAX).toBe(120);
		expect(suchtextZaehlerText(45)).toBe('45 von 120 Zeichen');
	});

	test('FR-19: Kontakt des Partners als Link, weitere Paare ohne das eigene', () => {
		expect(waehlbar('079 000 00 01')).toBe('0790000001');
		expect(waehlbar('+41 (79) 000-00-01')).toBe('+41790000001');
		const lea = { rufname: null, vorname: 'Lea', nachname: 'Beispiel' };
		const marco = { rufname: 'Max', vorname: 'Marco', nachname: 'Muster' };
		const jonas = { rufname: null, vorname: 'Jonas', nachname: 'Keller' };
		const nina = { rufname: null, vorname: 'Nina', nachname: 'Brunner' };
		expect(
			weiterePaare(
				[
					[lea, marco],
					[jonas, nina]
				],
				marco
			)
		).toEqual([[jonas, nina]]);
	});

	test('A-ANMELDUNG-04: Paare in der kurzen Textform mit Rufname', () => {
		expect(paareText([])).toBe('Noch niemand angemeldet.');
		expect(
			paareText([
				[
					{ rufname: null, vorname: 'Lea', nachname: 'Beispiel' },
					{ rufname: 'Hannes', vorname: 'Johannes', nachname: 'Muster' }
				],
				[
					{ rufname: 'Nina', vorname: 'Nina', nachname: 'Brunner' },
					{ rufname: null, vorname: 'Jonas', nachname: 'Keller' }
				]
			])
		).toBe('Angemeldet (2): Lea Beispiel / Hannes (Johannes Muster), Nina Brunner / Jonas Keller');
	});

	test('FR-48: Rückfrage vor der Anfrage nennt den Angefragten mit der Anrede', () => {
		expect(rueckfrageText('Marco')).toBe(
			'Marco sieht deinen Namen, deine Klassierung und deine Telefonnummer (ohne Telefon deine ' +
				'E-Mail), damit Marco dich erreichen kann. Nimmt Marco an, seid ihr angemeldet. Dann ' +
				'sehen deine Gegner und dein Doppelpartner während der Clubmeisterschaft deine ' +
				'E-Mail-Adresse und Telefonnummer.'
		);
	});

	test('FR-19: Anfrage-Karte sagt vor dem Annehmen, dass auch die Gegner den Kontakt sehen', () => {
		expect(ANNEHMEN_HINWEIS).toBe(
			'Nimmst du an, seid ihr angemeldet. Dann sehen deine Gegner und dein Doppelpartner ' +
				'während der Clubmeisterschaft deine E-Mail-Adresse und Telefonnummer.'
		);
	});
});

describe('Übersicht einer CM: Plakette, Anzahl, Kontakt', () => {
	const name = { rufname: null, vorname: 'Anna', nachname: 'Beispiel' };
	const ohne = { anmeldungId: null, eigen: null };

	test('standPlakette je eigenem Stand', () => {
		expect(standPlakette({ art: 'einzel', anmeldungId: 4, eigen: null }, false)).toEqual({
			text: 'angemeldet',
			art: 'ok'
		});
		expect(
			standPlakette(
				{
					art: 'doppel',
					anmeldungId: 5,
					eigen: { art: 'paar', partner: { name, telefon: null, email: null } }
				},
				false
			)
		).toEqual({ text: 'angemeldet', art: 'ok' });
		expect(
			standPlakette(
				{ art: 'doppel', anmeldungId: 6, eigen: { art: 'sucht', kommentar: null } },
				false
			)
		).toEqual({ text: 'sucht Partner', art: 'offen' });
		expect(standPlakette({ art: 'einzel', anmeldungId: 7, eigen: null }, true)).toEqual({
			text: 'Wildcard beantragt',
			art: 'offen'
		});
		expect(standPlakette({ art: 'einzel', ...ohne }, false)).toBeNull();
		expect(standPlakette({ art: 'doppel', ...ohne }, false)).toBeNull();
		expect(standPlakette({ art: 'einzel', ...ohne }, true)).toBeNull();
	});

	test('anmeldungenText zählt Namen im Einzel und Paare im Doppel', () => {
		const einzel = (n: number) => ({
			art: 'einzel' as const,
			namen: Array(n).fill(name),
			paare: []
		});
		const doppel = (n: number) => ({
			art: 'doppel' as const,
			namen: [],
			paare: Array(n).fill([name, name])
		});
		expect(anmeldungenText(einzel(0))).toBe('Noch niemand angemeldet');
		expect(anmeldungenText(einzel(1))).toBe('1 angemeldet');
		expect(anmeldungenText(einzel(12))).toBe('12 angemeldet');
		expect(anmeldungenText(doppel(0))).toBe('Noch niemand angemeldet');
		expect(anmeldungenText(doppel(1))).toBe('1 Paar');
		expect(anmeldungenText(doppel(5))).toBe('5 Paare');
	});

	test('suchendeText in Einzahl und Mehrzahl', () => {
		expect(suchendeText(1)).toBe('1 sucht Partner');
		expect(suchendeText(3)).toBe('3 suchen Partner');
	});

	test('kontaktFragenText nennt die Kontaktperson mit Rolle', () => {
		expect(kontaktFragenText('Anna Beispiel')).toBe(
			'Bei Fragen oder Problemen melde dich bei Anna Beispiel (CM-Admin).'
		);
	});
});
