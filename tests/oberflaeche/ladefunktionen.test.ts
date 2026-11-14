import { isHttpError, isRedirect } from '@sveltejs/kit';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { load as startseite } from '../../src/routes/+page.ts';
import { load as wurzel } from '../../src/routes/+layout.ts';
import { load as interclub } from '../../src/routes/interclub/+page.ts';
import { load as interclubTeam } from '../../src/routes/interclub/[id]/+page.ts';
import { load as interclubBegegnung } from '../../src/routes/interclub/[id]/[begegnung]/+page.ts';
import { load as profil } from '../../src/routes/profil/+page.ts';
import { load as profilEmail } from '../../src/routes/profil/email/+page.ts';
import { load as verwaltungLayout } from '../../src/routes/verwaltung/+layout.ts';
import { load as verwaltungEinstieg } from '../../src/routes/verwaltung/+page.ts';
import { load as anlass } from '../../src/routes/verwaltung/anlaesse/[id]/+page.ts';
import { load as anlaesse } from '../../src/routes/verwaltung/anlaesse/+page.ts';
import { load as briefe } from '../../src/routes/verwaltung/briefe/+page.ts';
import { load as fairgate } from '../../src/routes/verwaltung/fairgate/+page.ts';
import { load as mitglied } from '../../src/routes/verwaltung/mitglieder/[id]/+page.ts';
import { load as auskunft } from '../../src/routes/verwaltung/mitglieder/[id]/auskunft/+page.ts';
import { load as mitteilungen } from '../../src/routes/verwaltung/mitteilungen/+page.ts';
import { load as rollen } from '../../src/routes/verwaltung/rollen/+page.ts';
import { load as turnier } from '../../src/routes/verwaltung/turniere/[id]/+page.ts';
import { load as turniere } from '../../src/routes/verwaltung/turniere/+page.ts';
import { load as kategorie } from '../../src/routes/verwaltung/turniere/[id]/kategorien/[kid]/+page.ts';
import { load as verlauf } from '../../src/routes/verwaltung/verlauf/+page.ts';
import { load as kategorieNeu } from '../../src/routes/verwaltung/turniere/[id]/kategorien/neu/+page.ts';
import { load as nachrichten } from '../../src/routes/verwaltung/turniere/[id]/nachrichten/+page.ts';
import { load as gespraech } from '../../src/routes/verwaltung/turniere/[id]/nachrichten/[gid]/+page.ts';

// Ladefunktionen der Verwaltung und die Prüfung der Sitzung in der Mitglieder-App mit gestellten
// Antworten (Schritt 15, Anhang E.5 in docs/refactoring-analyse.md). Im Browser gewinnt die
// Umleitung des Layouts der Verwaltung; die Blöcke der Seiten dahinter sieht darum kein E2E-Test,
// auch die Abweichung «Rollen» nicht (Fall B). Der Test ruft die Ladefunktionen auf, wie SvelteKit
// sie ruft, und hält fest, was sie heute werfen oder zurückgeben.

type Ergebnis =
	| { umleitung: string }
	| { fehler: number; text?: string }
	| { wurf: 'kein Fehler von SvelteKit' }
	| { daten: unknown };

/** Was ein Aufruf der Ladefunktion ergibt: Umleitung, Fehlerseite, anderer Wurf oder Daten. */
async function ergebnis(lauf: () => unknown): Promise<Ergebnis> {
	try {
		return { daten: await lauf() };
	} catch (e) {
		if (isRedirect(e)) return { umleitung: e.location };
		if (isHttpError(e)) return { fehler: e.status, text: e.body.message };
		return { wurf: 'kein Fehler von SvelteKit' };
	}
}

type Antwort = { status: number; koerper?: unknown } | 'netz-weg';

/** Gestelltes `fetch`: dieselbe Antwort für jede Adresse, oder je Adresse eine eigene. */
function stelle(antwort: Antwort | ((pfad: string) => Antwort)) {
	const angefragt: string[] = [];
	const holen = (async (eingabe: RequestInfo | URL) => {
		const pfad = String(eingabe);
		angefragt.push(pfad);
		const a = typeof antwort === 'function' ? antwort(pfad) : antwort;
		if (a === 'netz-weg') throw new TypeError('Failed to fetch');
		return new Response(a.koerper === undefined ? null : JSON.stringify(a.koerper), {
			status: a.status
		});
	}) as typeof fetch;
	return { holen, angefragt };
}

/** Ein Ereignis, wie SvelteKit es einer Ladefunktion reicht; nur, was die Ladefunktionen lesen. */
function ereignis(
	holen: typeof fetch,
	{
		pfad = '/verwaltung/mitglieder',
		params = {},
		eltern = { ansicht: null },
		url
	}: { pfad?: string; params?: Record<string, string>; eltern?: object; url?: URL } = {}
) {
	return {
		fetch: holen,
		params,
		url: url ?? new URL(`http://localhost${pfad}`),
		depends: () => {},
		parent: async () => eltern
	} as never;
}

const ABGEMELDET: Antwort = { status: 401, koerper: { fehler: 'abgemeldet' } };
const KEIN_ADMIN: Antwort = { status: 403, koerper: { fehler: 'kein-admin' } };
const UNBESTAETIGT: Antwort = { status: 403, koerper: { fehler: 'unbestaetigt' } };
const NICHT_GEFUNDEN: Antwort = { status: 404, koerper: { fehler: 'nicht-gefunden' } };
const STOERUNG: Antwort = { status: 503, koerper: { fehler: 'stoerung' } };

type Seite = {
	name: string;
	load: (e: never) => unknown;
	params?: Record<string, string>;
	keinAdmin: string;
	nichtGefunden: Ergebnis;
	stoerung: number;
};

const SEITEN: Seite[] = [
	{
		name: 'anlaesse/[id]',
		load: anlass,
		params: { id: '3' },
		keinAdmin: '/',
		nichtGefunden: { fehler: 404, text: 'Diesen Anlass gibt es nicht.' },
		stoerung: 503
	},
	{
		name: 'briefe',
		load: briefe,
		keinAdmin: '/',
		nichtGefunden: { fehler: 503, text: 'Die Liste lässt sich gerade nicht laden.' },
		stoerung: 503
	},
	{
		name: 'fairgate',
		load: fairgate,
		keinAdmin: '/',
		nichtGefunden: { fehler: 503, text: 'Die Liste lässt sich gerade nicht laden.' },
		stoerung: 503
	},
	{
		name: 'mitglieder/[id]',
		load: mitglied,
		params: { id: '3' },
		keinAdmin: '/',
		nichtGefunden: { fehler: 404, text: 'Dieses Mitglied gibt es nicht.' },
		stoerung: 503
	},
	{
		name: 'mitglieder/[id]/auskunft',
		load: auskunft,
		params: { id: '3' },
		keinAdmin: '/',
		nichtGefunden: { fehler: 404, text: 'Zu diesem Mitglied gibt es keine Auskunft.' },
		stoerung: 503
	},
	{
		name: 'mitteilungen',
		load: mitteilungen,
		keinAdmin: '/',
		nichtGefunden: { fehler: 503, text: 'Die Mitteilungen lassen sich gerade nicht laden.' },
		stoerung: 503
	},
	{
		name: 'turniere/[id]',
		load: turnier,
		params: { id: '3' },
		keinAdmin: '/',
		nichtGefunden: { fehler: 404, text: 'Dieses Turnier gibt es nicht.' },
		stoerung: 503
	},
	{
		name: 'turniere/[id]/kategorien/[kid]',
		load: kategorie,
		params: { id: '3', kid: '7' },
		keinAdmin: '/',
		nichtGefunden: { fehler: 404, text: 'Diese Kategorie gibt es nicht.' },
		stoerung: 503
	},
	{
		name: 'turniere/[id]/kategorien/neu',
		load: kategorieNeu,
		params: { id: '3' },
		keinAdmin: '/',
		nichtGefunden: { fehler: 404, text: 'Dieses Turnier gibt es nicht.' },
		stoerung: 503
	},
	{
		name: 'turniere/[id]/nachrichten',
		load: nachrichten,
		params: { id: '3' },
		keinAdmin: '/',
		nichtGefunden: { fehler: 404, text: 'Dieses Turnier gibt es nicht.' },
		stoerung: 503
	},
	{
		name: 'turniere/[id]/nachrichten/[gid]',
		load: gespraech,
		params: { id: '3', gid: '5' },
		keinAdmin: '/',
		nichtGefunden: { umleitung: '/verwaltung/turniere/3/nachrichten' },
		stoerung: 503
	},
	// Fall B: Ohne Rolle führt die Seite «Rollen» zur Verwaltung, nicht zur Startseite.
	{
		name: 'rollen',
		load: rollen,
		keinAdmin: '/verwaltung',
		nichtGefunden: { fehler: 503, text: 'Die Rollen lassen sich gerade nicht laden.' },
		stoerung: 503
	}
];

describe('Seiten der Verwaltung: der Block hinter dem Layout', () => {
	describe.each(SEITEN)('$name', (s) => {
		const lauf = (a: Antwort) => ergebnis(() => s.load(ereignis(stelle(a).holen, s)));

		test('ohne Sitzung zum Login', async () => {
			expect(await lauf(ABGEMELDET)).toEqual({ umleitung: '/login' });
		});

		test(`ohne Rolle nach ${s.keinAdmin}`, async () => {
			expect(await lauf(KEIN_ADMIN)).toEqual({ umleitung: s.keinAdmin });
		});

		test('ohne Bestätigung zu «Verwaltung öffnen»', async () => {
			expect(await lauf(UNBESTAETIGT)).toEqual({ umleitung: '/verwaltung/bestaetigen' });
		});

		test('nicht gefunden', async () => {
			expect(await lauf(NICHT_GEFUNDEN)).toEqual(s.nichtGefunden);
		});

		test('Störung des Servers: Fehlerseite', async () => {
			expect(await lauf(STOERUNG)).toMatchObject({ fehler: s.stoerung });
		});

		test('Netz weg: dieselbe Fehlerseite wie bei der Störung', async () => {
			expect(await lauf('netz-weg')).toEqual(await lauf(STOERUNG));
		});
	});

	// Die Verwaltung verlangt einen lesbaren Körper (Vertrag in src/lib/verwaltung/api.ts).
	test('ein 401 ohne lesbaren Körper ist eine Störung, keine Umleitung', async () => {
		expect(await ergebnis(() => briefe(ereignis(stelle({ status: 401 }).holen)))).toEqual({
			fehler: 503,
			text: 'Die Liste lässt sich gerade nicht laden.'
		});
	});
});

/** Antworten für das Layout: der Zugang und, wo verlangt, die Liste Für Fairgate. */
const zugang = (daten: object) => (pfad: string) =>
	pfad.endsWith('/zugang')
		? { status: 200, koerper: daten }
		: { status: 200, koerper: [{ id: 1 }, { id: 2 }] };

describe('Layout der Verwaltung', () => {
	const lauf = (
		antwort: Antwort | ((pfad: string) => Antwort),
		pfad = '/verwaltung/mitglieder',
		ansicht: string | null = null
	) =>
		ergebnis(() =>
			verwaltungLayout(ereignis(stelle(antwort).holen, { pfad, eltern: { ansicht } }))
		);

	test('ohne Sitzung zum Login; ein 401 ohne lesbaren Körper ist eine Störung', async () => {
		expect(await lauf(ABGEMELDET)).toEqual({ umleitung: '/login' });
		expect(await lauf({ status: 401 })).toEqual({
			fehler: 503,
			text: 'Die Verwaltung lässt sich gerade nicht öffnen.'
		});
	});

	test('ohne Rolle zur Startseite', async () => {
		expect(await lauf(KEIN_ADMIN)).toEqual({ umleitung: '/' });
	});

	test('jede andere Antwort ist die Fehlerseite der Verwaltung, auch ein «unbestaetigt»', async () => {
		const fehler = { fehler: 503, text: 'Die Verwaltung lässt sich gerade nicht öffnen.' };
		expect(await lauf(UNBESTAETIGT)).toEqual(fehler);
		expect(await lauf(NICHT_GEFUNDEN)).toEqual(fehler);
		expect(await lauf(STOERUNG)).toEqual(fehler);
		expect(await lauf('netz-weg')).toEqual(fehler);
	});

	test('ohne Bestätigung zu «Verwaltung öffnen»; dort bleibt die Seite', async () => {
		const offen = zugang({ bestaetigt: false, rollen: ['mytco'] });
		expect(await lauf(offen, '/verwaltung/mitglieder')).toEqual({
			umleitung: '/verwaltung/bestaetigen'
		});
		expect(await lauf(offen, '/verwaltung/rollen')).toEqual({
			umleitung: '/verwaltung/bestaetigen'
		});
		expect(await lauf(offen, '/verwaltung/bestaetigen')).toMatchObject({
			daten: { rollen: ['mytco'], fairgateAnzahl: null }
		});
	});

	test('schon bestätigt auf «Verwaltung öffnen»: zum Startziel der Rollen', async () => {
		expect(
			await lauf(zugang({ bestaetigt: true, rollen: ['mytco'] }), '/verwaltung/bestaetigen')
		).toEqual({ umleitung: '/verwaltung/mitglieder' });
		expect(
			await lauf(zugang({ bestaetigt: true, rollen: ['cm'] }), '/verwaltung/bestaetigen')
		).toEqual({ umleitung: '/verwaltung/turniere' });
	});

	test('ausserhalb der lesbaren Bereiche zum Startziel, ohne Schreibrecht zur Liste', async () => {
		expect(
			await lauf(zugang({ bestaetigt: true, rollen: ['cm'] }), '/verwaltung/mitglieder')
		).toEqual({ umleitung: '/verwaltung/turniere' });
		expect(
			await lauf(zugang({ bestaetigt: true, rollen: ['mitglieder'] }), '/verwaltung/rollen')
		).toEqual({ umleitung: '/verwaltung/mitglieder' });
		expect(
			await lauf(
				zugang({ bestaetigt: true, rollen: ['mitglieder'] }),
				'/verwaltung/mitglieder/neu',
				'mitglieder'
			)
		).toEqual({ umleitung: '/verwaltung/mitglieder' });
		expect(
			await lauf(
				zugang({ bestaetigt: true, rollen: ['cm'] }),
				'/verwaltung/turniere/3/kategorien/neu',
				'cm'
			)
		).toEqual({ umleitung: '/verwaltung/turniere/3' });
	});

	test('bestätigt im eigenen Bereich: Rechte und Zahl für Fairgate', async () => {
		expect(
			await lauf(
				zugang({ bestaetigt: true, mitgliedId: 4, rollen: ['mytco'] }),
				'/verwaltung/mitglieder'
			)
		).toEqual({
			daten: {
				eigeneMitgliedId: 4,
				fairgateAnzahl: 2,
				rollen: ['mytco'],
				darfLesen: { mitglieder: true, cm: true, rollen: true },
				darfSchreiben: { mitglieder: false, cm: false, rollen: true }
			}
		});
	});

	test('der Einstieg /verwaltung führt zum Startziel', async () => {
		const einstieg = (r: string[]) =>
			ergebnis(() =>
				verwaltungEinstieg(ereignis(stelle(STOERUNG).holen, { eltern: { rollen: r } }))
			);
		expect(await einstieg(['mitglieder'])).toEqual({ umleitung: '/verwaltung/mitglieder' });
		expect(await einstieg(['cm'])).toEqual({ umleitung: '/verwaltung/turniere' });
	});
});

const SITZUNG = {
	vorname: 'Erika',
	rufname: null,
	passkeyHinweis: false,
	verwaltung: false,
	ansicht: null,
	nachrichtenOffen: 0
};

describe('Mitglieder-App: Prüfung der Sitzung (Fall G)', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const ANMELDUNG = 'Die Anmeldung lässt sich gerade nicht prüfen.';
	const SEITEN_MIT_SITZUNG = [
		{ name: '/', load: startseite },
		{ name: '/profil', load: profil },
		{ name: '/profil/email', load: profilEmail }
	];

	describe.each(SEITEN_MIT_SITZUNG)('$name', (s) => {
		const lauf = (a: Antwort) =>
			ergebnis(() => s.load(ereignis(stelle(a).holen, { pfad: s.name })));

		test('Störung des Servers: Fehlerseite 503 mit eigenem Satz', async () => {
			expect(await lauf(STOERUNG)).toEqual({ fehler: 503, text: ANMELDUNG });
			expect(await lauf({ status: 500 })).toEqual({ fehler: 503, text: ANMELDUNG });
		});

		test('Netz weg: der Wurf geht weiter (die App zeigt die allgemeine Fehlerseite)', async () => {
			expect(await lauf('netz-weg')).toEqual({ wurf: 'kein Fehler von SvelteKit' });
		});
	});

	test('/profil/email ohne Sitzung zum Login, auch wenn ein Mail-Code wartet (Fall A)', async () => {
		const speicher = new Map([
			['mytco-mailanfrage', JSON.stringify({ email: 'wartet@example.org', zeit: Date.now() })]
		]);
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => speicher.get(k) ?? null,
			setItem: (k: string, v: string) => speicher.set(k, v),
			removeItem: (k: string) => speicher.delete(k)
		});
		expect(await ergebnis(() => profilEmail(ereignis(stelle(ABGEMELDET).holen)))).toEqual({
			umleitung: '/login'
		});
		expect(await ergebnis(() => profil(ereignis(stelle(ABGEMELDET).holen)))).toEqual({
			umleitung: '/login/mail'
		});
	});

	test('die Startseite liest Vorname und Kacheln aus der Sitzung', async () => {
		const { holen, angefragt } = stelle((pfad) =>
			pfad === '/api/sitzung' ? { status: 200, koerper: SITZUNG } : { status: 200, koerper: [] }
		);
		expect(await ergebnis(() => startseite(ereignis(holen, { pfad: '/' })))).toEqual({
			daten: {
				vorname: 'Erika',
				rufname: null,
				passkeyHinweis: false,
				verwaltung: false,
				nachrichtenOffen: 0,
				anlaesse: [],
				turniere: []
			}
		});
		expect(angefragt[0]).toBe('/api/sitzung');
	});

	test('die Startseite ohne lesbaren Körper der Sitzung: allgemeine Fehlerseite', async () => {
		expect(
			await ergebnis(() => startseite(ereignis(stelle({ status: 200 }).holen, { pfad: '/' })))
		).toEqual({ wurf: 'kein Fehler von SvelteKit' });
	});

	test('das Wurzel-Layout zeigt das Band nur mit Sitzung und laufender Ansicht', async () => {
		const band = (a: Antwort) => ergebnis(() => wurzel(ereignis(stelle(a).holen, { pfad: '/' })));
		expect(await band({ status: 200, koerper: { ...SITZUNG, ansicht: 'cm' } })).toEqual({
			daten: { ansicht: 'cm', interclub: false }
		});
		expect(await band({ status: 200, koerper: SITZUNG })).toEqual({
			daten: { ansicht: null, interclub: false }
		});
		expect(await band({ status: 200 })).toEqual({ daten: { ansicht: null, interclub: false } });
		expect(await band(ABGEMELDET)).toEqual({ daten: { ansicht: null, interclub: false } });
		expect(await band(STOERUNG)).toEqual({ daten: { ansicht: null, interclub: false } });
		expect(await band('netz-weg')).toEqual({ daten: { ansicht: null, interclub: false } });
	});

	// Anhang E.7, Abschnitt 2: Ohne Sitzung (auch bei Störung oder unlesbarer Sitzung) und mit
	// laufender Ansicht liest das Layout die Adresse; dann lädt SvelteKit es bei jedem Wechsel neu.
	// Mit Sitzung und ohne Ansicht nicht. `interclub` gilt nur, wenn der Server genau `true` sendet.
	test('das Wurzel-Layout: Reiter IC nur bei interclub true, neu geprüft ohne Sitzung', async () => {
		const lauf = async (a: Antwort) => {
			let gelesen = 0;
			const url = new URL('http://localhost/');
			Object.defineProperty(url, 'pathname', {
				get: () => {
					gelesen++;
					return '/';
				}
			});
			const r = await ergebnis(() => wurzel(ereignis(stelle(a).holen, { url })));
			return { ...r, liestAdresse: gelesen > 0 };
		};
		const ohne = { daten: { ansicht: null, interclub: false } };
		expect(
			await lauf({ status: 200, koerper: { ...SITZUNG, ansicht: 'cm', interclub: true } })
		).toEqual({ daten: { ansicht: 'cm', interclub: true }, liestAdresse: true });
		expect(await lauf({ status: 200, koerper: { ...SITZUNG, interclub: true } })).toEqual({
			daten: { ansicht: null, interclub: true },
			liestAdresse: false
		});
		expect(await lauf({ status: 200, koerper: SITZUNG })).toEqual({ ...ohne, liestAdresse: false });
		expect(await lauf({ status: 200, koerper: { ...SITZUNG, interclub: 'ja' } })).toEqual({
			...ohne,
			liestAdresse: false
		});
		expect(await lauf({ status: 200 })).toEqual({ ...ohne, liestAdresse: true });
		expect(await lauf({ status: 200, koerper: null })).toEqual({ ...ohne, liestAdresse: true });
		expect(await lauf(ABGEMELDET)).toEqual({ ...ohne, liestAdresse: true });
		expect(await lauf(STOERUNG)).toEqual({ ...ohne, liestAdresse: true });
		expect(await lauf('netz-weg')).toEqual({ ...ohne, liestAdresse: true });
	});
});

/** Gestellter Gerätespeicher; mit `wartet` steht die Mail-Anfrage darin (wie Fall A). */
function geraetespeicher(wartet: boolean) {
	const speicher = new Map<string, string>(
		wartet
			? [['mytco-mailanfrage', JSON.stringify({ email: 'wartet@example.org', zeit: Date.now() })]]
			: []
	);
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => speicher.get(k) ?? null,
		setItem: (k: string, v: string) => speicher.set(k, v),
		removeItem: (k: string) => speicher.delete(k)
	});
}

// Die drei Seiten des Reiters IC (#81, Anhang E.7 Abschnitt 1): Fall `mitglied` des Wächters; die
// Umleitungen bei ungültiger oder unbekannter Nummer stehen in der Seite (Fall L). Der Vertrag von
// Interclub verlangt einen lesbaren Körper: Ein 401 ohne ihn ist eine Störung (Fall M).
describe('Interclub', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const ICSEITEN: {
		name: string;
		load: (e: never) => unknown;
		params: Record<string, string>;
		satz: string;
	}[] = [
		{
			name: '/interclub',
			load: interclub,
			params: {},
			satz: 'Die Interclub-Resultate lassen sich gerade nicht laden.'
		},
		{
			name: '/interclub/[id]',
			load: interclubTeam,
			params: { id: '7' },
			satz: 'Das Team lässt sich gerade nicht laden.'
		},
		{
			name: '/interclub/[id]/[begegnung]',
			load: interclubBegegnung,
			params: { id: '7', begegnung: '9' },
			satz: 'Die Begegnung lässt sich gerade nicht laden.'
		}
	];

	const lauf = (
		load: (e: never) => unknown,
		a: Antwort | ((pfad: string) => Antwort),
		params: Record<string, string>
	) => {
		const { holen, angefragt } = stelle(a);
		return ergebnis(() => load(ereignis(holen, { params }))).then((r) => ({ r, angefragt }));
	};

	describe.each(ICSEITEN)('$name', (s) => {
		test('ohne Sitzung zum Login, mit wartendem Mail-Code zum Feld dafür', async () => {
			geraetespeicher(false);
			expect((await lauf(s.load, ABGEMELDET, s.params)).r).toEqual({ umleitung: '/login' });
			geraetespeicher(true);
			expect((await lauf(s.load, ABGEMELDET, s.params)).r).toEqual({
				umleitung: '/login/mail'
			});
		});

		test('ein 401 ohne lesbaren Körper ist eine Störung (Fall M)', async () => {
			expect((await lauf(s.load, { status: 401 }, s.params)).r).toEqual({
				fehler: 503,
				text: s.satz
			});
		});

		test('Störung des Servers und Netz weg: Fehlerseite 503 mit dem Satz der Seite', async () => {
			expect((await lauf(s.load, STOERUNG, s.params)).r).toEqual({ fehler: 503, text: s.satz });
			expect((await lauf(s.load, 'netz-weg', s.params)).r).toEqual({ fehler: 503, text: s.satz });
		});
	});

	test('/interclub: ohne Interclub-Daten bleibt die Seite, mit Daten die Übersicht', async () => {
		expect((await lauf(interclub, NICHT_GEFUNDEN, {})).r).toEqual({
			daten: { uebersicht: null }
		});
		const koerper = { saison: 2026, teams: [] };
		const { r, angefragt } = await lauf(interclub, { status: 200, koerper }, {});
		expect(r).toEqual({ daten: { uebersicht: koerper } });
		expect(angefragt).toEqual(['/api/interclub']);
	});

	test('/interclub/[id]: ungültige Nummer ohne Anfrage zur Übersicht', async () => {
		for (const id of ['abc', '0', '-1', '1.5']) {
			const { r, angefragt } = await lauf(interclubTeam, { status: 200, koerper: {} }, { id });
			expect(r, id).toEqual({ umleitung: '/interclub' });
			expect(angefragt, id).toEqual([]);
		}
	});

	test('/interclub/[id]: unbekanntes Team zur Übersicht, sonst das Team', async () => {
		expect((await lauf(interclubTeam, NICHT_GEFUNDEN, { id: '7' })).r).toEqual({
			umleitung: '/interclub'
		});
		const koerper = { teamId: 7, liga: '2L' };
		const { r, angefragt } = await lauf(interclubTeam, { status: 200, koerper }, { id: '7' });
		expect(r).toEqual({ daten: { team: koerper } });
		expect(angefragt).toEqual(['/api/interclub/teams/7']);
	});

	test('/interclub/[id]/[begegnung]: ungültige Nummern ohne Anfrage zur Übersicht bzw. zum Team', async () => {
		const ok = { status: 200, koerper: {} };
		for (const id of ['abc', '0']) {
			const { r, angefragt } = await lauf(interclubBegegnung, ok, { id, begegnung: '9' });
			expect(r, id).toEqual({ umleitung: '/interclub' });
			expect(angefragt, id).toEqual([]);
		}
		for (const begegnung of ['abc', '0']) {
			const { r, angefragt } = await lauf(interclubBegegnung, ok, { id: '7', begegnung });
			expect(r, begegnung).toEqual({ umleitung: '/interclub/7' });
			expect(angefragt, begegnung).toEqual([]);
		}
	});

	test('/interclub/[id]/[begegnung]: unbekannte Begegnung zum Team, sonst die Begegnung', async () => {
		const params = { id: '7', begegnung: '9' };
		expect((await lauf(interclubBegegnung, NICHT_GEFUNDEN, params)).r).toEqual({
			umleitung: '/interclub/7'
		});
		const koerper = { begegnungId: 9, heim: 'Olten 1' };
		const { r, angefragt } = await lauf(interclubBegegnung, { status: 200, koerper }, params);
		expect(r).toEqual({ daten: { begegnung: koerper } });
		expect(angefragt).toEqual(['/api/interclub/teams/7/begegnungen/9']);
	});
});

// Die vier Listen der Verwaltung (Schritt 15, Lauf 2, E-48): Ihr erstes Laden steht in `+page.ts`.
// Zugang wie die anderen Seiten der Verwaltung (Fall `verwaltung`); jede andere Antwort ist
// «nicht geladen» (`zeilen: null`), keine Fehlerseite: Die Seite zeigt die Meldung der Störung,
// wie vorher der Baustein.
type Liste = {
	name: string;
	load: (e: never) => unknown;
	pfad: string;
	abfrage: string;
	daten: (zeilen: unknown) => object;
};

const LISTEN: Liste[] = [
	{
		name: 'turniere',
		load: turniere,
		pfad: '/verwaltung/turniere',
		abfrage: '/api/admin/turniere',
		daten: (zeilen) => ({ zeilen })
	},
	{
		name: 'anlaesse',
		load: anlaesse,
		pfad: '/verwaltung/anlaesse',
		abfrage: '/api/admin/anlaesse',
		daten: (zeilen) => ({ zeilen })
	},
	{
		name: 'verlauf',
		load: verlauf,
		pfad: '/verwaltung/verlauf',
		abfrage: '/api/admin/verlauf',
		daten: (zeilen) => ({ mitglied: undefined, zeilen })
	}
];

describe('Listen der Verwaltung: erstes Laden', () => {
	describe.each(LISTEN)('$name', (s) => {
		const lauf = async (a: Antwort) => {
			const { holen, angefragt } = stelle(a);
			const r = await ergebnis(() => s.load(ereignis(holen, { pfad: s.pfad })));
			return { r, angefragt };
		};

		test('ohne Sitzung, Rolle oder Bestätigung wie die anderen Seiten der Verwaltung', async () => {
			expect((await lauf(ABGEMELDET)).r).toEqual({ umleitung: '/login' });
			expect((await lauf(KEIN_ADMIN)).r).toEqual({ umleitung: '/' });
			expect((await lauf(UNBESTAETIGT)).r).toEqual({ umleitung: '/verwaltung/bestaetigen' });
		});

		test('Störung, Netz weg, nicht gefunden, 401 ohne Körper: nicht geladen, keine Fehlerseite', async () => {
			for (const a of [STOERUNG, 'netz-weg', NICHT_GEFUNDEN, { status: 401 }] as Antwort[]) {
				expect((await lauf(a)).r, JSON.stringify(a)).toEqual({ daten: s.daten(null) });
			}
		});

		test('mit Liste: die Zeilen, eine Anfrage', async () => {
			const { r, angefragt } = await lauf({ status: 200, koerper: [{ id: 3 }] });
			expect(r).toEqual({ daten: s.daten([{ id: 3 }]) });
			expect(angefragt).toEqual([s.abfrage]);
		});
	});

	// Der Filter des Verlaufs ist die Adresse: nur Ziffern gelten, sonst alle Einträge.
	test('verlauf: «?mitglied=» aus der Adresse', async () => {
		for (const [suche, mitglied, abfrage] of [
			['?mitglied=3', 3, '/api/admin/verlauf?mitglied=3'],
			['?mitglied=abc', undefined, '/api/admin/verlauf'],
			['?mitglied=', undefined, '/api/admin/verlauf']
		] as const) {
			const { holen, angefragt } = stelle({ status: 200, koerper: [] });
			const r = await ergebnis(() =>
				verlauf(ereignis(holen, { pfad: `/verwaltung/verlauf${suche}` }))
			);
			expect(r, suche).toEqual({ daten: { mitglied, zeilen: [] } });
			expect(angefragt, suche).toEqual([abfrage]);
		}
	});
});
