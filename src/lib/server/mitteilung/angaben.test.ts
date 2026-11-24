import { describe, expect, test } from 'vitest';
import { pruefeKategorie, pruefeMitteilung } from './angaben.ts';

const AUSWAHLEN = ['alle', 'keine-antwort'] as const;
const GUT = { titel: 'Erinnerung', text: 'Bitte melde dich an.', auswahl: 'alle', weg: 'push' };

describe('Mitteilung prüfen', () => {
	test('FR-42: gültige Angaben kommen getrimmt zurück', () => {
		expect(
			pruefeMitteilung(
				{ ...GUT, titel: '  Erinnerung ', text: ' Bitte melde dich an.\n', weg: 'push-und-mail' },
				AUSWAHLEN
			)
		).toEqual({
			ok: true,
			werte: {
				titel: 'Erinnerung',
				text: 'Bitte melde dich an.',
				auswahl: 'alle',
				weg: 'push-und-mail'
			}
		});
	});

	test('FR-42: Titel 50 Zeichen ok, 51 abgewiesen', () => {
		expect(pruefeMitteilung({ ...GUT, titel: 'a'.repeat(50) }, AUSWAHLEN).ok).toBe(true);
		expect(pruefeMitteilung({ ...GUT, titel: 'a'.repeat(51) }, AUSWAHLEN)).toEqual({
			ok: false,
			felder: ['titel']
		});
	});

	test('FR-42: Text 200 Zeichen ok, 201 abgewiesen', () => {
		expect(pruefeMitteilung({ ...GUT, text: 'a'.repeat(200) }, AUSWAHLEN).ok).toBe(true);
		expect(pruefeMitteilung({ ...GUT, text: 'a'.repeat(201) }, AUSWAHLEN)).toEqual({
			ok: false,
			felder: ['text']
		});
	});

	test('FR-42: Text leer nach trim abgewiesen', () => {
		expect(pruefeMitteilung({ ...GUT, text: ' \n\t ' }, AUSWAHLEN)).toEqual({
			ok: false,
			felder: ['text']
		});
		expect(pruefeMitteilung({ ...GUT, titel: '   ' }, AUSWAHLEN)).toEqual({
			ok: false,
			felder: ['titel']
		});
	});

	test('FR-43: Auswahl nur aus der übergebenen Liste', () => {
		for (const auswahl of ['kommt', '', 1, null, undefined])
			expect(pruefeMitteilung({ ...GUT, auswahl }, AUSWAHLEN), String(auswahl)).toEqual({
				ok: false,
				felder: ['auswahl']
			});
		expect(pruefeMitteilung({ ...GUT, auswahl: 'keine-antwort' }, AUSWAHLEN).ok).toBe(true);
	});

	test('FR-44: unbekannter Weg abgewiesen', () => {
		for (const weg of ['mail', 'PUSH', '', null, 3])
			expect(pruefeMitteilung({ ...GUT, weg }, AUSWAHLEN), String(weg)).toEqual({
				ok: false,
				felder: ['weg']
			});
		for (const weg of ['push', 'push-sonst-mail', 'push-und-mail'])
			expect(pruefeMitteilung({ ...GUT, weg }, AUSWAHLEN).ok, weg).toBe(true);
	});

	test('FR-42: falsche Form meldet alle Felder', () => {
		for (const roh of [null, 'x', 42, []])
			expect(pruefeMitteilung(roh, AUSWAHLEN)).toEqual({
				ok: false,
				felder: ['titel', 'text', 'auswahl', 'weg']
			});
		expect(
			pruefeMitteilung({ titel: 5, text: {}, auswahl: 'alle', weg: 'push' }, AUSWAHLEN)
		).toEqual({ ok: false, felder: ['titel', 'text'] });
	});
});

// Aktive Kategorien eines erfundenen Turniers.
const KATEGORIEN = [
	{ id: 11, name: 'Herren R1–R5', art: 'einzel' as const },
	{ id: 12, name: 'Herren Doppel', art: 'doppel' as const }
];

describe('Kategorie einer Mitteilung zum Turnier prüfen', () => {
	test('Spec A6: ohne Kategorie gilt das ganze Turnier', () => {
		for (const roh of [{}, { kategorieId: null }, null, 'x'])
			for (const auswahl of ['alle', 'angemeldet', 'berechtigt', 'sucht-partner'] as const)
				expect(
					pruefeKategorie(roh, auswahl, KATEGORIEN),
					`${auswahl} ${JSON.stringify(roh)}`
				).toEqual({
					ok: true,
					kategorie: null
				});
	});

	test('Spec A6: eine Kategorie des Turniers kommt mit Namen zurück', () => {
		expect(pruefeKategorie({ kategorieId: 11 }, 'angemeldet', KATEGORIEN)).toEqual({
			ok: true,
			kategorie: { id: 11, name: 'Herren R1–R5' }
		});
		expect(pruefeKategorie({ kategorieId: 11 }, 'berechtigt', KATEGORIEN)).toEqual({
			ok: true,
			kategorie: { id: 11, name: 'Herren R1–R5' }
		});
		expect(pruefeKategorie({ kategorieId: 12 }, 'sucht-partner', KATEGORIEN)).toEqual({
			ok: true,
			kategorie: { id: 12, name: 'Herren Doppel' }
		});
	});

	test('Spec A6: unbekannte Kategorie, Kategorie bei alle, Einzel bei sucht-partner abgewiesen', () => {
		for (const kategorieId of [13, 0, -1, 11.5, '11', true, {}])
			expect(
				pruefeKategorie({ kategorieId }, 'angemeldet', KATEGORIEN),
				JSON.stringify(kategorieId)
			).toEqual({ ok: false });
		expect(pruefeKategorie({ kategorieId: 11 }, 'alle', KATEGORIEN)).toEqual({ ok: false });
		expect(pruefeKategorie({ kategorieId: 11 }, 'sucht-partner', KATEGORIEN)).toEqual({
			ok: false
		});
	});
});
