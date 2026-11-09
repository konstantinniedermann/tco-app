import { describe, expect, it } from 'vitest';
import type { CmStand } from './api.ts';
import { cmEinstieg } from './einstieg.ts';

const stand = (id: number, name: string): CmStand => ({
	id,
	name,
	anmeldeschluss: '2027-05-31',
	status: 'offen',
	anzahl: 0,
	anfragen: 0,
	neueAntwort: false
});

describe('cmEinstieg: oberste Seite des Reiters CM', () => {
	it('zeigt einen Hinweis, wenn keine CM läuft', () => {
		expect(cmEinstieg([])).toEqual({ art: 'keine' });
	});

	it('führt direkt zur einzigen laufenden CM', () => {
		expect(cmEinstieg([stand(7, 'Clubmeisterschaft 2027')])).toEqual({ art: 'eine', id: 7 });
	});

	it('zeigt mehrere laufende CMs zur Auswahl, in der gegebenen Reihenfolge', () => {
		const a = stand(3, 'Clubmeisterschaft 2027');
		const b = stand(4, 'Clubmeisterschaft 2028');
		expect(cmEinstieg([a, b])).toEqual({ art: 'mehrere', turniere: [a, b] });
	});
});
