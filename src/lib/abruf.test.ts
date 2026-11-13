import { describe, expect, test } from 'vitest';
import { STATUS_ALLEIN, rufeAb, type Holen, type Vertrag } from './abruf.ts';
import {
	FEHLERWOERTER,
	STATUS_DES_WORTS,
	type FehlerStatus,
	type Fehlerkoerper,
	type Fehlerwort
} from './fehler.ts';

type Aufruf = { pfad: string; init: RequestInit };

function holer(antwort: Response | Error) {
	const aufrufe: Aufruf[] = [];
	const holen: Holen = async (pfad, init) => {
		aufrufe.push({ pfad, init });
		if (antwort instanceof Error) throw antwort;
		return antwort;
	};
	return { aufrufe, holen };
}

// Gestellte Antworten: Ein Fehler-Status nimmt nur einen Körper aus der gemeinsamen Liste an.
type Koerper<S extends number> = S extends FehlerStatus ? Fehlerkoerper : unknown;
const json = <S extends number>(status: S, inhalt: Koerper<S>) => Response.json(inhalt, { status });

/** Absichtlich ausserhalb der Liste: Antworten, die der Server nie so sendet. */
const ungeprueft = (status: number, inhalt: unknown) => Response.json(inhalt, { status });
const unlesbar = (status: number) => new Response('kein JSON', { status });
const leer = (status: number) => new Response(null, { status });

const STOERUNG = { art: 'stoerung' };
const GET: RequestInit = { method: 'GET' };

const PFLICHT: Vertrag<'abgemeldet' | 'nicht-gefunden' | 'veraltet' | 'eingabe'> = {
	woerter: ['abgemeldet', 'nicht-gefunden', 'veraltet', 'eingabe'],
	koerper: 'pflicht'
};

const ab = <W extends Fehlerwort>(antwort: Response | Error, vertrag: Vertrag<W>) =>
	rufeAb<unknown, W>('/api/probe', GET, holer(antwort).holen, vertrag);

describe('Tabelle Wort → Status (src/lib/fehler.ts)', () => {
	test('jedes Fehlerwort hat genau einen Status, und keinen ausserhalb der Liste', () => {
		expect(Object.keys(STATUS_DES_WORTS).sort()).toEqual([...FEHLERWOERTER].sort());
	});

	test('401, 404 und 429 tragen je genau das Wort, für das der Status allein genügt', () => {
		for (const [status, wort] of Object.entries(STATUS_ALLEIN)) {
			const woerter = FEHLERWOERTER.filter((w) => STATUS_DES_WORTS[w] === Number(status));
			expect(woerter).toEqual([wort]);
		}
		expect(Object.keys(STATUS_ALLEIN)).toEqual(['401', '404', '429']);
	});
});

describe('Abruf-Baustein: Anfrage und Erfolg', () => {
	test('reicht Pfad und Anfrage unverändert an holen', async () => {
		const h = holer(json(200, { a: 1 }));
		const init: RequestInit = { method: 'POST', body: '{}' };
		await rufeAb('/api/x', init, h.holen, PFLICHT);
		expect(h.aufrufe).toHaveLength(1);
		expect(h.aufrufe[0].pfad).toBe('/api/x');
		expect(h.aufrufe[0].init).toBe(init);
		expect(init).toEqual({ method: 'POST', body: '{}' });
	});

	test('jedes 2xx mit JSON ist ok mit dem Körper als Daten, auch JSON null', async () => {
		expect(await ab(json(200, { a: 1 }), PFLICHT)).toEqual({ art: 'ok', daten: { a: 1 } });
		expect(await ab(json(201, [1]), PFLICHT)).toEqual({ art: 'ok', daten: [1] });
		expect(await ab(json(202, {}), PFLICHT)).toEqual({ art: 'ok', daten: {} });
		expect(await ab(ungeprueft(200, null), PFLICHT)).toEqual({ art: 'ok', daten: null });
	});

	test('wirft nie: Netzfehler, auch synchron geworfen, und 5xx sind Störung', async () => {
		expect(await ab(new Error('weg'), PFLICHT)).toEqual(STOERUNG);
		const wirft: Holen = () => {
			throw new Error('sofort');
		};
		expect(await rufeAb('/api/x', GET, wirft, PFLICHT)).toEqual(STOERUNG);
		expect(await ab(json(500, {}), PFLICHT)).toEqual(STOERUNG);
		expect(await ab(json(503, { fehler: 'veraltet' }), PFLICHT)).toEqual(STOERUNG);
	});
});

describe('Abruf-Baustein: Wort und Status', () => {
	test('ein Wort des Vertrags gilt mit seinem Status und kommt mit dem ganzen Körper', async () => {
		expect(await ab(json(409, { fehler: 'veraltet' }), PFLICHT)).toEqual({
			art: 'veraltet',
			koerper: { fehler: 'veraltet' }
		});
		const felder = { titel: 'Bitte angeben.' };
		expect(await ab(json(400, { fehler: 'eingabe', felder }), PFLICHT)).toEqual({
			art: 'eingabe',
			koerper: { fehler: 'eingabe', felder }
		});
	});

	test('ein Wort mit falschem Status ist Störung', async () => {
		expect(await ab(json(400, { fehler: 'veraltet' }), PFLICHT)).toEqual(STOERUNG);
		expect(await ab(json(409, { fehler: 'eingabe' }), PFLICHT)).toEqual(STOERUNG);
	});

	test('ein Wort der Liste, das der Vertrag nicht nennt, und ein Wort ausserhalb sind Störung', async () => {
		expect(await ab(json(409, { fehler: 'voll' }), PFLICHT)).toEqual(STOERUNG);
		expect(await ab(json(403, { fehler: 'kein-recht' }), PFLICHT)).toEqual(STOERUNG);
		expect(await ab(ungeprueft(409, { fehler: 'unbekannt' }), PFLICHT)).toEqual(STOERUNG);
		expect(await ab(ungeprueft(409, {}), PFLICHT)).toEqual(STOERUNG);
	});

	test('für 401, 404 und 429 genügt der Status, wenn der Vertrag sein Wort nennt', async () => {
		expect(await ab(ungeprueft(401, {}), PFLICHT)).toEqual({ art: 'abgemeldet', koerper: {} });
		expect(await ab(json(401, { fehler: 'veraltet' }), PFLICHT)).toEqual({
			art: 'abgemeldet',
			koerper: { fehler: 'veraltet' }
		});
		expect(await ab(ungeprueft(404, {}), PFLICHT)).toEqual({
			art: 'nicht-gefunden',
			koerper: {}
		});
		const mitZuViele: Vertrag<'zu-viele'> = { woerter: ['zu-viele'], koerper: 'pflicht' };
		expect(await ab(ungeprueft(429, {}), mitZuViele)).toEqual({ art: 'zu-viele', koerper: {} });
	});

	test('nennt der Vertrag das Wort des Status nicht, ist es Störung', async () => {
		expect(await ab(json(429, { fehler: 'zu-viele' }), PFLICHT)).toEqual(STOERUNG);
		const ohne: Vertrag<'veraltet'> = { woerter: ['veraltet'], koerper: 'pflicht' };
		expect(await ab(json(401, { fehler: 'abgemeldet' }), ohne)).toEqual(STOERUNG);
		expect(await ab(json(404, { fehler: 'nicht-gefunden' }), ohne)).toEqual(STOERUNG);
	});

	test('ein Fehlerkörper, der kein Objekt ist, zählt wie einer ohne Wort', async () => {
		expect(await ab(ungeprueft(401, []), PFLICHT)).toEqual({ art: 'abgemeldet', koerper: {} });
		expect(await ab(ungeprueft(401, 5), PFLICHT)).toEqual({ art: 'abgemeldet', koerper: {} });
		expect(await ab(ungeprueft(409, 'veraltet'), PFLICHT)).toEqual(STOERUNG);
	});
});

describe('Abruf-Baustein: Vertrag, Angabe 2 (Körper Pflicht oder nachsichtig)', () => {
	const NACHSICHTIG: Vertrag<'zu-viele' | 'falsch'> = {
		woerter: ['zu-viele', 'falsch'],
		koerper: 'nachsichtig'
	};

	test('Pflicht: ohne lesbaren Körper Störung, auch bei Erfolg, 401 und 204', async () => {
		expect(await ab(unlesbar(200), PFLICHT)).toEqual(STOERUNG);
		expect(await ab(unlesbar(401), PFLICHT)).toEqual(STOERUNG);
		expect(await ab(leer(204), PFLICHT)).toEqual(STOERUNG);
	});

	test('Pflicht: JSON null als Fehlerkörper ist Störung', async () => {
		expect(await ab(ungeprueft(401, null), PFLICHT)).toEqual(STOERUNG);
	});

	test('nachsichtig: ohne lesbaren Körper weiter, «nichts gelesen» bleibt von {} unterscheidbar', async () => {
		expect(await ab(unlesbar(200), NACHSICHTIG)).toEqual({ art: 'ok', daten: undefined });
		expect(await ab(leer(204), NACHSICHTIG)).toEqual({ art: 'ok', daten: undefined });
		expect(await ab(json(200, {}), NACHSICHTIG)).toEqual({ art: 'ok', daten: {} });
		expect(await ab(unlesbar(429), NACHSICHTIG)).toEqual({ art: 'zu-viele', koerper: {} });
		expect(await ab(unlesbar(400), NACHSICHTIG)).toEqual(STOERUNG);
		expect(await ab(ungeprueft(400, null), NACHSICHTIG)).toEqual(STOERUNG);
		expect(await ab(ungeprueft(429, null), NACHSICHTIG)).toEqual({
			art: 'zu-viele',
			koerper: {}
		});
		expect(await ab(json(400, { fehler: 'falsch' }), NACHSICHTIG)).toEqual({
			art: 'falsch',
			koerper: { fehler: 'falsch' }
		});
	});
});

describe('Abruf-Baustein: Vertrag, Angaben 3 und 4 (204, JSON null)', () => {
	test('204 als Erfolg: ok mit {} als Daten, ohne den Körper zu lesen', async () => {
		const v: Vertrag<'abgemeldet'> = {
			woerter: ['abgemeldet'],
			koerper: 'pflicht',
			ohneKoerper: 'erfolg'
		};
		expect(await ab(leer(204), v)).toEqual({ art: 'ok', daten: {} });
		expect(await ab(json(200, { a: 1 }), v)).toEqual({ art: 'ok', daten: { a: 1 } });
		expect(await ab(unlesbar(200), v)).toEqual(STOERUNG);
	});

	test('204 als einziger Erfolg: jedes andere 2xx ist Störung', async () => {
		const v: Vertrag<never> = { woerter: [], koerper: 'nachsichtig', ohneKoerper: 'einzig' };
		expect(await ab(leer(204), v)).toEqual({ art: 'ok', daten: {} });
		expect(await ab(json(200, {}), v)).toEqual(STOERUNG);
		expect(await ab(json(202, {}), v)).toEqual(STOERUNG);
		expect(await ab(json(401, { fehler: 'abgemeldet' }), v)).toEqual(STOERUNG);
	});

	test('JSON null als Fehlerkörper gilt als {}, wenn der Vertrag es sagt', async () => {
		const v = { ...PFLICHT, nullAlsLeer: true };
		expect(await ab(ungeprueft(401, null), v)).toEqual({ art: 'abgemeldet', koerper: {} });
		expect(await ab(ungeprueft(409, null), v)).toEqual(STOERUNG);
		expect(await ab(ungeprueft(200, null), v)).toEqual({ art: 'ok', daten: null });
	});
});
