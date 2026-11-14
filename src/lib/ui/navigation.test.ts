import { describe, expect, it } from 'vitest';
import {
	aktiverReiter,
	bereichVon,
	elternVon,
	reiterFuer,
	stelltStandWiederHer,
	uebergang,
	vergisstStand,
	zeigtFusszeile,
	zeigtReiter
} from './navigation.ts';

describe('Übergänge beim Seitenwechsel (UI-09)', () => {
	it('blendet auf gleicher Ebene über', () => {
		expect(uebergang('/', '/profil', 'link')).toBe('blende');
		expect(uebergang('/profil', '/', 'link')).toBe('blende');
		expect(uebergang('/login', '/', 'goto')).toBe('blende');
		expect(uebergang('/willkommen', '/login', 'link')).toBe('blende');
	});

	it('schiebt eine Ebene tiefer von rechts herein', () => {
		expect(uebergang('/', '/hilfe', 'link')).toBe('tiefer');
		expect(uebergang('/login', '/datenschutz', 'link')).toBe('tiefer');
		expect(uebergang('/login', '/login/mail', 'link')).toBe('tiefer');
		expect(uebergang('/profil', '/profil/email', 'link')).toBe('tiefer');
		expect(uebergang('/', '/anlass/[id]', 'link')).toBe('tiefer');
		expect(uebergang('/anlass/[id]', '/', 'link')).toBe('zurueck');
		const doppel = '/clubmeisterschaft/[id]/doppel/[kid]';
		expect(uebergang('/clubmeisterschaft/[id]', doppel, 'link')).toBe('tiefer');
		expect(uebergang(doppel, '/clubmeisterschaft/[id]', 'goto')).toBe('zurueck');
		const kategorie = '/clubmeisterschaft/[id]/kategorie/[kid]';
		expect(uebergang('/clubmeisterschaft/[id]', kategorie, 'link')).toBe('tiefer');
		expect(uebergang(kategorie, '/clubmeisterschaft/[id]', 'link')).toBe('zurueck');
		// A-TURNIER-04: das Gespräch mit der Turnierleitung liegt eine Stufe unter der CM.
		const kontakt = '/clubmeisterschaft/[id]/kontakt';
		expect(uebergang('/clubmeisterschaft/[id]', kontakt, 'link')).toBe('tiefer');
		expect(uebergang(kontakt, '/clubmeisterschaft/[id]', 'link')).toBe('zurueck');
	});

	it('schiebt zurück nach rechts weg', () => {
		expect(uebergang('/hilfe', '/', 'link')).toBe('zurueck');
		expect(uebergang('/hilfe', '/login', 'goto')).toBe('zurueck');
	});

	it('bewegt nichts bei Browser-Zurück, gleicher Seite, Verwaltung oder unbekannter Seite', () => {
		expect(uebergang('/', '/hilfe', 'popstate')).toBeNull();
		expect(uebergang('/', '/', 'link')).toBeNull();
		expect(uebergang('/profil', '/verwaltung', 'link')).toBeNull();
		expect(uebergang('/', null, 'link')).toBeNull();
		expect(uebergang(null, '/', 'goto')).toBeNull();
	});
});

describe('Reiter', () => {
	it('hat die Reiter Start · CM · Profil, mit Interclub-Daten Start · CM · IC · Profil', () => {
		expect(reiterFuer(false)).toEqual(['/', '/clubmeisterschaft', '/profil']);
		expect(reiterFuer(true)).toEqual(['/', '/clubmeisterschaft', '/interclub', '/profil']);
	});

	it.each([
		['/', '/'],
		['/anlass/[id]', '/'],
		['/hilfe', '/'],
		['/datenschutz', '/'],
		['/clubmeisterschaft', '/clubmeisterschaft'],
		['/clubmeisterschaft/[id]', '/clubmeisterschaft'],
		['/clubmeisterschaft/[id]/doppel/[kid]', '/clubmeisterschaft'],
		['/clubmeisterschaft/[id]/kategorie/[kid]', '/clubmeisterschaft'],
		['/clubmeisterschaft/[id]/kontakt', '/clubmeisterschaft'],
		['/interclub', '/interclub'],
		['/interclub/[id]', '/interclub'],
		['/interclub/[id]/[begegnung]', '/interclub'],
		['/profil', '/profil'],
		['/profil/email', '/profil'],
		['/login', null],
		['/login/mail', null],
		['/willkommen', null],
		['/verwaltung/mitglieder', null],
		[null, null]
	])('ordnet %s dem Bereich %s zu', (seite, bereich) => {
		expect(bereichVon(seite)).toBe(bereich);
	});

	it('zeigt die Reiter nach dem Login überall, Hilfe und Datenschutz ohne Sitzung ohne', () => {
		expect(zeigtReiter('/anlass/[id]', false)).toBe(true);
		expect(zeigtReiter('/profil/email', true)).toBe(true);
		expect(zeigtReiter('/interclub/[id]', true)).toBe(true);
		expect(zeigtReiter('/interclub/[id]/[begegnung]', true)).toBe(true);
		expect(zeigtReiter('/hilfe', true)).toBe(true);
		expect(zeigtReiter('/hilfe', false)).toBe(false);
		expect(zeigtReiter('/datenschutz', false)).toBe(false);
		expect(zeigtReiter('/login', true)).toBe(false);
		expect(zeigtReiter('/verwaltung/turniere', true)).toBe(false);
		expect(zeigtReiter(null, true)).toBe(false);
	});

	it('zeigt den Bereich des angetippten Ziels sofort als aktiv', () => {
		expect(aktiverReiter('/', '/profil')).toBe('/profil');
		expect(aktiverReiter('/profil/email', '/')).toBe('/');
		expect(aktiverReiter('/', '/clubmeisterschaft/[id]')).toBe('/clubmeisterschaft');
		expect(aktiverReiter('/', '/hilfe')).toBe('/');
		expect(aktiverReiter('/profil', '/login')).toBe('/profil');
		expect(aktiverReiter('/profil/email', null)).toBe('/profil');
	});

	it('beginnt oben, ausser beim Zurück-Link und der Zurück-Taste des Browsers', () => {
		expect(stelltStandWiederHer('/profil', '/', 'link')).toBe(false);
		expect(stelltStandWiederHer('/', '/', 'link')).toBe(false);
		expect(stelltStandWiederHer('/', '/hilfe', 'link')).toBe(false);
		expect(stelltStandWiederHer('/hilfe', '/', 'link')).toBe(true);
		expect(stelltStandWiederHer('/profil', '/', 'popstate')).toBe(true);
		expect(stelltStandWiederHer(null, '/', 'enter')).toBe(false);
	});

	it('vergisst Positionen und Aufklappbereiche beim Weg zum Login', () => {
		expect(vergisstStand('/login')).toBe(true);
		expect(vergisstStand('/login/mail')).toBe(true);
		expect(vergisstStand('/willkommen')).toBe(true);
		expect(vergisstStand('/')).toBe(false);
	});
});

describe('Zurück-Link führt eine Stufe höher in der festen Ordnung', () => {
	const k = { angemeldet: true, bereichsWurzel: false };
	it.each([
		['/anlass/[id]', k, { route: '/', text: 'Start' }],
		['/profil/email', k, { route: '/profil', text: 'Profil' }],
		['/clubmeisterschaft/[id]', k, { route: '/clubmeisterschaft', text: 'Clubmeisterschaft' }],
		['/clubmeisterschaft/[id]', { ...k, bereichsWurzel: true }, null],
		['/clubmeisterschaft/[id]/doppel/[kid]', k, { route: '/clubmeisterschaft/[id]', text: null }],
		[
			'/clubmeisterschaft/[id]/kategorie/[kid]',
			k,
			{ route: '/clubmeisterschaft/[id]', text: null }
		],
		['/clubmeisterschaft/[id]/kontakt', k, { route: '/clubmeisterschaft/[id]', text: null }],
		['/interclub/[id]', k, { route: '/interclub', text: 'Interclub' }],
		['/interclub/[id]/[begegnung]', k, { route: '/interclub/[id]', text: null }],
		['/interclub', k, null],
		['/hilfe', k, { route: '/', text: 'Start' }],
		['/datenschutz', k, { route: '/', text: 'Start' }],
		['/hilfe', { ...k, angemeldet: false }, { route: '/login', text: 'Anmelden' }],
		['/datenschutz', { ...k, angemeldet: false }, { route: '/login', text: 'Anmelden' }],
		['/login/mail', { ...k, angemeldet: false }, { route: '/login', text: 'Anmelden' }],
		['/', k, null],
		['/clubmeisterschaft', k, null],
		['/profil', k, null],
		[null, k, null]
	])('%s', (seite, kontext, eltern) => {
		expect(elternVon(seite, kontext)).toEqual(eltern);
	});
});

describe('Wechsel des Bereichs blendet über', () => {
	it('blendet, wenn beide Seiten in verschiedenen Bereichen liegen', () => {
		expect(uebergang('/', '/clubmeisterschaft/[id]', 'link')).toBe('blende');
		expect(uebergang('/clubmeisterschaft/[id]', '/', 'link')).toBe('blende');
		expect(uebergang('/profil', '/hilfe', 'link')).toBe('blende');
		expect(uebergang('/profil/email', '/', 'link')).toBe('blende');
		expect(uebergang('/', '/clubmeisterschaft', 'link')).toBe('blende');
		expect(uebergang('/clubmeisterschaft', '/interclub', 'link')).toBe('blende');
		expect(uebergang('/interclub/[id]', '/profil', 'link')).toBe('blende');
	});

	it('schiebt im selben Bereich weiter nach Ebenen', () => {
		expect(uebergang('/', '/anlass/[id]', 'link')).toBe('tiefer');
		expect(uebergang('/profil/email', '/profil', 'link')).toBe('zurueck');
		expect(uebergang('/clubmeisterschaft', '/clubmeisterschaft/[id]', 'link')).toBe('tiefer');
		expect(uebergang('/login', '/hilfe', 'link')).toBe('tiefer');
		expect(uebergang('/interclub', '/interclub/[id]', 'link')).toBe('tiefer');
		expect(uebergang('/interclub/[id]', '/interclub', 'link')).toBe('zurueck');
		expect(uebergang('/interclub/[id]', '/interclub/[id]/[begegnung]', 'link')).toBe('tiefer');
		expect(uebergang('/interclub/[id]/[begegnung]', '/interclub/[id]', 'link')).toBe('zurueck');
	});
});

describe('Fusszeile nur vor dem Login und auf der Startseite', () => {
	it('steht auf Einstiegsseite, Login, Login mit Mail-Code und Startseite', () => {
		for (const seite of ['/', '/login', '/login/mail', '/willkommen']) {
			expect(zeigtFusszeile(seite, false), seite).toBe(true);
		}
	});

	it('fehlt auf Profil, Hilfe, Datenschutz, Verwaltung und unbekannten Seiten', () => {
		for (const seite of ['/profil', '/hilfe', '/datenschutz', '/verwaltung/mitglieder', null]) {
			expect(zeigtFusszeile(seite, false), String(seite)).toBe(false);
		}
	});

	it('fehlt auf der Fehlerseite', () => {
		expect(zeigtFusszeile('/', true)).toBe(false);
	});
});
