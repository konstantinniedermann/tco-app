import { describe, expect, it } from 'vitest';
import { fragtVorWechsel, hatUngespeichertes } from './ungespeichert.ts';

describe('Ungespeicherte Änderungen (UI-Leitbild)', () => {
	const link = { type: 'link', willUnload: false } as const;

	it('fragt bei einem Link in der App, solange ein Formular ungespeichert ist', () => {
		expect(fragtVorWechsel(link, true)).toBe(true);
	});

	it('fragt nicht, wenn nichts ungespeichert ist', () => {
		expect(fragtVorWechsel(link, false)).toBe(false);
	});

	it('fragt nicht bei Wechseln der App selbst, der Zurück-Geste und beim Verlassen der App', () => {
		for (const type of ['goto', 'popstate', 'leave', 'form', 'enter'] as const) {
			expect(fragtVorWechsel({ type, willUnload: type === 'leave' }, true), type).toBe(false);
		}
	});

	it('fragt nicht bei Links aus der App hinaus (die Seite würde entladen)', () => {
		expect(fragtVorWechsel({ type: 'link', willUnload: true }, true)).toBe(false);
	});

	it('ein Formular ist ungespeichert, solange es data-ungespeichert trägt', () => {
		const gesucht: string[] = [];
		const mit = { querySelector: (s: string) => (gesucht.push(s), {}) };
		const ohne = { querySelector: () => null };
		expect(hatUngespeichertes(mit)).toBe(true);
		expect(gesucht).toEqual(['[data-ungespeichert]']);
		expect(hatUngespeichertes(ohne)).toBe(false);
	});
});
