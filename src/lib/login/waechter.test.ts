import { isRedirect } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { leiteUmBeimLaden, leiteUmNachAktion, zielOhneZugang, type Lage } from './waechter.ts';

const navigation = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => navigation);
vi.mock('$app/paths', () => ({ resolve: (pfad: string) => pfad }));

const OHNE: Lage = { mailCodeWartet: false, einstiegZeigen: false };
const MAIL: Lage = { mailCodeWartet: true, einstiegZeigen: false };
const EINSTIEG: Lage = { mailCodeWartet: false, einstiegZeigen: true };
const BEIDES: Lage = { mailCodeWartet: true, einstiegZeigen: true };

// Die Tabelle aus Anhang E.5 (docs/refactoring-analyse.md), je Zelle und Lage; leer heisst: keine
// Umleitung, die Ladefunktion entscheidet selbst (meist eine Fehlerseite).
describe('zielOhneZugang: die Tabelle', () => {
	test.each([
		// Startseite: Mail-Code vor Einstiegsseite vor Login.
		['abgemeldet', 'start', OHNE, '/login'],
		['abgemeldet', 'start', MAIL, '/login/mail'],
		['abgemeldet', 'start', EINSTIEG, '/willkommen'],
		['abgemeldet', 'start', BEIDES, '/login/mail'],
		['kein-admin', 'start', OHNE, null],
		['unbestaetigt', 'start', OHNE, null],
		// Profil, Anlass, CM-Seiten: Mail-Code, sonst Login; nie die Einstiegsseite (Fall F).
		['abgemeldet', 'mitglied', OHNE, '/login'],
		['abgemeldet', 'mitglied', MAIL, '/login/mail'],
		['abgemeldet', 'mitglied', EINSTIEG, '/login'],
		['abgemeldet', 'mitglied', BEIDES, '/login/mail'],
		['kein-admin', 'mitglied', OHNE, null],
		['unbestaetigt', 'mitglied', OHNE, null],
		// /profil/email und jede Aktion der Mitglieder-App: nur Login (Fälle A und C).
		['abgemeldet', 'ohne-mailcode', OHNE, '/login'],
		['abgemeldet', 'ohne-mailcode', BEIDES, '/login'],
		['kein-admin', 'ohne-mailcode', OHNE, null],
		['unbestaetigt', 'ohne-mailcode', OHNE, null],
		// Seiten der Verwaltung und `leiteUm`: ohne Mail-Code (Fall E).
		['abgemeldet', 'verwaltung', OHNE, '/login'],
		['abgemeldet', 'verwaltung', BEIDES, '/login'],
		['kein-admin', 'verwaltung', OHNE, '/'],
		['kein-admin', 'verwaltung', BEIDES, '/'],
		['unbestaetigt', 'verwaltung', OHNE, '/verwaltung/bestaetigen'],
		['unbestaetigt', 'verwaltung', BEIDES, '/verwaltung/bestaetigen'],
		// Layout der Verwaltung: Die Bestätigung liest es aus den Daten, nicht aus einem Wort.
		['abgemeldet', 'verwaltung-zugang', OHNE, '/login'],
		['abgemeldet', 'verwaltung-zugang', BEIDES, '/login'],
		['kein-admin', 'verwaltung-zugang', OHNE, '/'],
		['unbestaetigt', 'verwaltung-zugang', OHNE, null],
		// Seite «Rollen»: ohne Rolle zur Verwaltung (Fall B).
		['abgemeldet', 'verwaltung-rollen', OHNE, '/login'],
		['abgemeldet', 'verwaltung-rollen', BEIDES, '/login'],
		['kein-admin', 'verwaltung-rollen', OHNE, '/verwaltung'],
		['unbestaetigt', 'verwaltung-rollen', OHNE, '/verwaltung/bestaetigen']
	] as const)('%s, Fall %s, %o → %s', (art, fall, lage, ziel) => {
		expect(zielOhneZugang(art, fall, lage)).toBe(ziel);
	});

	test.each(['ok', 'stoerung', 'nicht-gefunden', 'eingabe', 'zu-viele'])(
		'«%s» ist kein Fall des Wächters',
		(art) => {
			for (const fall of [
				'start',
				'mitglied',
				'ohne-mailcode',
				'verwaltung',
				'verwaltung-zugang',
				'verwaltung-rollen'
			] as const) {
				expect(zielOhneZugang(art, fall, BEIDES)).toBeNull();
			}
		}
	);
});

/** Ein Gerätespeicher mit oder ohne wartende Mail-Anfrage. */
function speicherMit(wartet: boolean) {
	const eintraege = new Map<string, string>();
	if (wartet) {
		eintraege.set(
			'mytco-mailanfrage',
			JSON.stringify({ email: 'wartet@example.org', zeit: Date.now() })
		);
	}
	return {
		getItem: (k: string) => eintraege.get(k) ?? null,
		setItem: (k: string, v: string) => void eintraege.set(k, v),
		removeItem: (k: string) => void eintraege.delete(k)
	};
}

/** Ein Handy im Browser (Einstiegsseite) oder ein PC. */
function geraet(handy: boolean) {
	vi.stubGlobal('navigator', {
		userAgent: handy ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' : 'Mozilla/5.0'
	});
	vi.stubGlobal('window', { matchMedia: () => ({ matches: false }), navigator: {} });
}

/** Jeder Zugriff wirft: So zeigt der Test, dass die Hülle nur liest, was ihre Zelle braucht. */
function verboten(name: string) {
	vi.stubGlobal(
		name,
		new Proxy(
			{},
			{
				get() {
					throw new Error(`${name} gelesen`);
				}
			}
		)
	);
}

async function wurf(lauf: () => unknown): Promise<string | null> {
	try {
		await lauf();
		return null;
	} catch (e) {
		if (isRedirect(e)) return e.location;
		throw e;
	}
}

describe('leiteUmBeimLaden: Hülle für die Ladefunktion', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('mit Erfolg kehrt sie zurück, ohne Speicher oder Gerät zu lesen', async () => {
		verboten('localStorage');
		verboten('navigator');
		expect(await wurf(() => leiteUmBeimLaden({ art: 'ok' }, 'start'))).toBeNull();
	});

	test('eine leere Zelle leitet nicht um', async () => {
		expect(await wurf(() => leiteUmBeimLaden({ art: 'kein-admin' }, 'mitglied'))).toBeNull();
		expect(
			await wurf(() => leiteUmBeimLaden({ art: 'unbestaetigt' }, 'verwaltung-zugang'))
		).toBeNull();
	});

	test('die Verwaltung liest weder Speicher noch Gerät', async () => {
		verboten('localStorage');
		verboten('navigator');
		verboten('window');
		expect(await wurf(() => leiteUmBeimLaden({ art: 'abgemeldet' }, 'verwaltung'))).toBe('/login');
		expect(await wurf(() => leiteUmBeimLaden({ art: 'kein-admin' }, 'verwaltung-rollen'))).toBe(
			'/verwaltung'
		);
	});

	test('/profil/email liest den Speicher nicht (Fall A)', async () => {
		verboten('localStorage');
		expect(await wurf(() => leiteUmBeimLaden({ art: 'abgemeldet' }, 'ohne-mailcode'))).toBe(
			'/login'
		);
	});

	test('mit wartendem Mail-Code fragt die Startseite das Gerät gar nicht', async () => {
		vi.stubGlobal('localStorage', speicherMit(true));
		verboten('navigator');
		expect(await wurf(() => leiteUmBeimLaden({ art: 'abgemeldet' }, 'start'))).toBe('/login/mail');
	});

	test('die Startseite auf dem Handy im Browser zeigt die Einstiegsseite, am PC das Login', async () => {
		vi.stubGlobal('localStorage', speicherMit(false));
		geraet(true);
		expect(await wurf(() => leiteUmBeimLaden({ art: 'abgemeldet' }, 'start'))).toBe('/willkommen');
		geraet(false);
		expect(await wurf(() => leiteUmBeimLaden({ art: 'abgemeldet' }, 'start'))).toBe('/login');
	});

	test('eine Mitglieder-Seite fragt das Gerät nie (Fall F)', async () => {
		vi.stubGlobal('localStorage', speicherMit(false));
		verboten('navigator');
		expect(await wurf(() => leiteUmBeimLaden({ art: 'abgemeldet' }, 'mitglied'))).toBe('/login');
		vi.stubGlobal('localStorage', speicherMit(true));
		expect(await wurf(() => leiteUmBeimLaden({ art: 'abgemeldet' }, 'mitglied'))).toBe(
			'/login/mail'
		);
	});
});

describe('leiteUmNachAktion: Hülle nach einer Aktion', () => {
	beforeEach(() => {
		navigation.goto.mockClear();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('abgemeldet: Wechsel in der App zum Login, ohne Blick auf den Mail-Code (Fall C)', async () => {
		verboten('localStorage');
		expect(await leiteUmNachAktion({ art: 'abgemeldet' })).toBe(true);
		expect(navigation.goto).toHaveBeenCalledExactlyOnceWith('/login');
	});

	test('kein Fall des Wächters: nichts geschieht', async () => {
		expect(await leiteUmNachAktion({ art: 'stoerung' })).toBe(false);
		expect(await leiteUmNachAktion({ art: 'kein-admin' })).toBe(false);
		expect(navigation.goto).not.toHaveBeenCalled();
	});

	test('die Verwaltung nimmt ihre Zeile der Tabelle', async () => {
		expect(await leiteUmNachAktion({ art: 'kein-admin' }, 'verwaltung')).toBe(true);
		expect(await leiteUmNachAktion({ art: 'unbestaetigt' }, 'verwaltung')).toBe(true);
		expect(navigation.goto.mock.calls).toEqual([['/'], ['/verwaltung/bestaetigen']]);
	});

	test('«ganz neu laden» lädt die App mit der Adresse neu statt zu wechseln (Fall D)', async () => {
		const assign = vi.fn();
		vi.stubGlobal('window', { location: { assign } });
		expect(await leiteUmNachAktion({ art: 'abgemeldet' }, 'ohne-mailcode', 'ganz-neu')).toBe(true);
		expect(assign).toHaveBeenCalledExactlyOnceWith('/login');
		expect(navigation.goto).not.toHaveBeenCalled();
	});

	test('«ganz neu laden» ohne Fall des Wächters: nichts geschieht', async () => {
		const assign = vi.fn();
		vi.stubGlobal('window', { location: { assign } });
		expect(await leiteUmNachAktion({ art: 'stoerung' }, 'ohne-mailcode', 'ganz-neu')).toBe(false);
		expect(assign).not.toHaveBeenCalled();
	});
});
