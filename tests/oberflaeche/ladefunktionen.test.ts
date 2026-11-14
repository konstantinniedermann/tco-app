import { isHttpError, isRedirect } from '@sveltejs/kit';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { load as startseite } from '../../src/routes/+page.ts';
import { load as wurzel } from '../../src/routes/+layout.ts';
import { load as profil } from '../../src/routes/profil/+page.ts';
import { load as profilEmail } from '../../src/routes/profil/email/+page.ts';
import { load as verwaltungLayout } from '../../src/routes/verwaltung/+layout.ts';
import { load as verwaltungEinstieg } from '../../src/routes/verwaltung/+page.ts';
import { load as anlass } from '../../src/routes/verwaltung/anlaesse/[id]/+page.ts';
import { load as briefe } from '../../src/routes/verwaltung/briefe/+page.ts';
import { load as fairgate } from '../../src/routes/verwaltung/fairgate/+page.ts';
import { load as mitglied } from '../../src/routes/verwaltung/mitglieder/[id]/+page.ts';
import { load as auskunft } from '../../src/routes/verwaltung/mitglieder/[id]/auskunft/+page.ts';
import { load as mitteilungen } from '../../src/routes/verwaltung/mitteilungen/+page.ts';
import { load as rollen } from '../../src/routes/verwaltung/rollen/+page.ts';
import { load as turnier } from '../../src/routes/verwaltung/turniere/[id]/+page.ts';
import { load as kategorie } from '../../src/routes/verwaltung/turniere/[id]/kategorien/[kid]/+page.ts';
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
		eltern = { ansicht: null }
	}: { pfad?: string; params?: Record<string, string>; eltern?: object } = {}
) {
	return {
		fetch: holen,
		params,
		url: new URL(`http://localhost${pfad}`),
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
});
