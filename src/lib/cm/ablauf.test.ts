import { describe, expect, test, vi } from 'vitest';
import { MELDUNG } from '../login/anmelden.ts';
import { fuehreAblauf, type Seite } from './ablauf.ts';
import type { Ergebnis } from './api.ts';

/** Eine Seite wie die CM-Seite: Sperre, Meldung und Fehler sind Felder, Neuladen und Wächter Attrappen. */
function seite(): Seite & {
	neuLaden: ReturnType<typeof vi.fn>;
	waechter: ReturnType<typeof vi.fn>;
} {
	return {
		laeuft: false,
		meldung: 'Meldung von vorher',
		fehler: 'Fehler von vorher',
		neuLaden: vi.fn(async () => true),
		waechter: vi.fn(async () => true)
	};
}

const ergebnis =
	<T>(r: Ergebnis<T>) =>
	async () =>
		r;

describe('fuehreAblauf', () => {
	test('ok: ruft die Folge der Seite mit den Daten, lädt nicht neu und fragt den Wächter nicht', async () => {
		const s = seite();
		const ok = vi.fn(async () => {});
		await fuehreAblauf(s, { abruf: ergebnis({ art: 'ok', daten: 42 }), ok, woerter: {} });
		expect(ok).toHaveBeenCalledWith(42);
		expect(s.neuLaden).not.toHaveBeenCalled();
		expect(s.waechter).not.toHaveBeenCalled();
		expect(s.fehler).toBeNull();
		expect(s.meldung).toBeNull();
	});

	test('Meldung und Fehler sind vor dem Abruf geleert, `vorher` läuft danach und vor dem Abruf, die Sperre steht', async () => {
		const s = seite();
		const reihe: string[] = [];
		await fuehreAblauf(s, {
			vorher: () => reihe.push(`vorher ${s.meldung} ${s.fehler} ${s.laeuft}`),
			abruf: async () => {
				reihe.push(`abruf ${s.meldung} ${s.fehler} ${s.laeuft}`);
				return { art: 'ok', daten: null };
			},
			ok: async () => {},
			woerter: {}
		});
		expect(reihe).toEqual(['vorher null null true', 'abruf null null true']);
	});

	test('ein zweiter Aufruf während des ersten tut nichts', async () => {
		const s = seite();
		let gib: (r: Ergebnis<number>) => void = () => {};
		const abruf = vi.fn(() => new Promise<Ergebnis<number>>((r) => (gib = r)));
		const ok = vi.fn(async () => {});
		const erster = fuehreAblauf(s, { abruf, ok, woerter: {} });
		s.meldung = 'steht';
		await fuehreAblauf(s, { abruf, ok, woerter: {} });
		expect(abruf).toHaveBeenCalledTimes(1);
		expect(s.meldung).toBe('steht');
		gib({ art: 'ok', daten: 1 });
		await erster;
		expect(ok).toHaveBeenCalledTimes(1);
		expect(s.laeuft).toBe(false);
	});

	test('Wort mit Satz: zuerst `vorWort`, dann der Satz, dann das Neuladen', async () => {
		const s = seite();
		const reihe: string[] = [];
		s.neuLaden.mockImplementation(async () => {
			reihe.push(`neu laden ${s.fehler}`);
			return true;
		});
		await fuehreAblauf(s, {
			abruf: ergebnis({ art: 'geschlossen' }),
			ok: async () => {},
			woerter: { geschlossen: 'Zu.', 'nicht-gefunden': null },
			vorWort: () => reihe.push(`vor ${s.fehler}`)
		});
		expect(reihe).toEqual(['vor null', 'neu laden Zu.']);
		expect(s.fehler).toBe('Zu.');
		expect(s.waechter).not.toHaveBeenCalled();
	});

	test('stilles Wort: kein Satz, nur das Neuladen', async () => {
		const s = seite();
		await fuehreAblauf(s, {
			abruf: ergebnis({ art: 'nicht-gefunden' }),
			ok: async () => {},
			woerter: { geschlossen: 'Zu.', 'nicht-gefunden': null }
		});
		expect(s.fehler).toBeNull();
		expect(s.neuLaden).toHaveBeenCalledTimes(1);
	});

	test('`danach` ersetzt das Neuladen; das Ergebnis des Neuladens wertet niemand aus', async () => {
		const s = seite();
		s.neuLaden.mockResolvedValue(false);
		const danach = vi.fn(async () => {
			await s.neuLaden();
		});
		await fuehreAblauf(s, {
			abruf: ergebnis({ art: 'hinfaellig' }),
			ok: async () => {},
			woerter: { hinfaellig: 'Gilt nicht mehr.' },
			danach
		});
		expect(danach).toHaveBeenCalledTimes(1);
		expect(s.neuLaden).toHaveBeenCalledTimes(1);
		expect(s.fehler).toBe('Gilt nicht mehr.');
	});

	test.each([
		['ein Wort, das die Aktion nicht nennt', { art: 'voll' } as const],
		['stoerung', { art: 'stoerung' } as const],
		['eingabe ohne Angabe dafür', { art: 'eingabe', felder: { kommentar: 'x' } } as const]
	])('%s: Störung als Fehler der Seite, kein Neuladen', async (_, r) => {
		const s = seite();
		const vorWort = vi.fn();
		await fuehreAblauf(s, {
			abruf: ergebnis<number>(r),
			ok: async () => {},
			woerter: { geschlossen: 'Zu.' },
			vorWort
		});
		expect(s.fehler).toBe(MELDUNG.stoerung);
		expect(s.neuLaden).not.toHaveBeenCalled();
		expect(vorWort).not.toHaveBeenCalled();
	});

	test('Störung am genannten Ort: die Seite bekommt den Satz, ihr Fehler bleibt leer', async () => {
		const s = seite();
		const stoerung = vi.fn();
		await fuehreAblauf(s, {
			abruf: ergebnis({ art: 'stoerung' }),
			ok: async () => {},
			woerter: {},
			stoerung
		});
		expect(stoerung).toHaveBeenCalledWith(MELDUNG.stoerung);
		expect(s.fehler).toBeNull();
	});

	test('eingabe mit Angabe: die Felder gehen an die Seite, keine Störung, kein Neuladen', async () => {
		const s = seite();
		const eingabe = vi.fn(async () => {});
		const stoerung = vi.fn();
		await fuehreAblauf(s, {
			abruf: ergebnis({ art: 'eingabe', felder: { suchtext: 'Zu lang.' } }),
			ok: async () => {},
			woerter: {},
			eingabe,
			stoerung
		});
		expect(eingabe).toHaveBeenCalledWith({ suchtext: 'Zu lang.' });
		expect(stoerung).not.toHaveBeenCalled();
		expect(s.fehler).toBeNull();
		expect(s.neuLaden).not.toHaveBeenCalled();
	});

	test('abgemeldet: an den Wächter mit dem Ergebnis, kein Satz, kein Neuladen', async () => {
		const s = seite();
		const ok = vi.fn(async () => {});
		await fuehreAblauf(s, {
			abruf: ergebnis({ art: 'abgemeldet' }),
			ok,
			woerter: { geschlossen: 'Zu.' }
		});
		expect(s.waechter).toHaveBeenCalledWith({ art: 'abgemeldet' });
		expect(s.fehler).toBeNull();
		expect(s.neuLaden).not.toHaveBeenCalled();
		expect(ok).not.toHaveBeenCalled();
	});

	describe('die Sperre ist gelöst, bevor die Folge läuft (eine gesperrte Taste nimmt keinen Fokus)', () => {
		test('bei ok', async () => {
			const s = seite();
			let gesperrt: boolean | null = null;
			await fuehreAblauf(s, {
				abruf: ergebnis({ art: 'ok', daten: 1 }),
				ok: async () => {
					gesperrt = s.laeuft;
				},
				woerter: {}
			});
			expect(gesperrt).toBe(false);
		});

		test('bei einem Wort, vor `vorWort`, dem Neuladen und `danach`', async () => {
			const s = seite();
			const gesehen: boolean[] = [];
			await fuehreAblauf(s, {
				abruf: ergebnis({ art: 'geschlossen' }),
				ok: async () => {},
				woerter: { geschlossen: 'Zu.' },
				vorWort: () => gesehen.push(s.laeuft),
				danach: async () => {
					gesehen.push(s.laeuft);
				}
			});
			expect(gesehen).toEqual([false, false]);
		});

		test('bei eingabe, Störung und abgemeldet', async () => {
			const s = seite();
			const gesehen: boolean[] = [];
			const merke = async () => {
				gesehen.push(s.laeuft);
			};
			s.waechter.mockImplementation(merke);
			const schritt = {
				ok: async () => {},
				woerter: {},
				eingabe: merke,
				stoerung: () => void merke()
			};
			await fuehreAblauf(s, { ...schritt, abruf: ergebnis({ art: 'eingabe', felder: {} }) });
			await fuehreAblauf(s, { ...schritt, abruf: ergebnis({ art: 'stoerung' }) });
			await fuehreAblauf(s, { ...schritt, abruf: ergebnis({ art: 'abgemeldet' }) });
			expect(gesehen).toEqual([false, false, false]);
		});
	});
});
