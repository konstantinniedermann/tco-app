import { describe, expect, it } from 'vitest';
import { VERLAUF_ARTEN, verlaufAbfrage } from './verlauf-spalten.ts';

describe('Verlauf-Spalten', () => {
	it('#92: jede Art der Änderung hat genau ein Häkchen mit Text', () => {
		expect(VERLAUF_ARTEN).toHaveLength(13);
		expect(VERLAUF_ARTEN.find((a) => a.wert === 'feld-geaendert')?.text).toBe('Angabe geändert');
		expect(VERLAUF_ARTEN.find((a) => a.wert === 'rolle-vergeben')?.text).toBe('Rolle vergeben');
		expect(new Set(VERLAUF_ARTEN.map((a) => a.text)).size).toBe(13);
	});

	it('#92: Filter werden zur Abfrage an den Server, leere fallen weg', () => {
		expect(verlaufAbfrage({}, undefined)).toEqual({});
		expect(
			verlaufAbfrage(
				{
					zeit: { art: 'bereich', von: '2026-10-01', bis: null },
					wer: { art: 'text', text: ' Studer ' },
					name: { art: 'text', text: '' },
					was: { art: 'werte', werte: ['rolle-vergeben', 'angelegt'] }
				},
				5
			)
		).toEqual({
			mitglied: 5,
			von: '2026-10-01',
			wer: 'Studer',
			was: ['rolle-vergeben', 'angelegt']
		});
	});
});
