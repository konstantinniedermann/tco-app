import { describe, expect, it } from 'vitest';
import {
	aktiverReiter,
	istReiterSeite,
	stellStandWiederHer,
	uebergang,
	vergisstStand,
	zeigtFusszeile
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
	it('kennt Start und Profil als Reiter-Seiten', () => {
		expect(istReiterSeite('/')).toBe(true);
		expect(istReiterSeite('/profil')).toBe(true);
		expect(istReiterSeite('/hilfe')).toBe(false);
		expect(istReiterSeite(null)).toBe(false);
	});

	it('zeigt den angetippten Reiter sofort als aktiv, andere Ziele ändern nichts', () => {
		expect(aktiverReiter('/', '/profil')).toBe('/profil');
		expect(aktiverReiter('/', '/hilfe')).toBe('/');
		expect(aktiverReiter('/profil', null)).toBe('/profil');
	});

	it('stellt die Scrollposition nur beim Tippen auf einen Reiter wieder her', () => {
		expect(stellStandWiederHer('/', 'link')).toBe(true);
		expect(stellStandWiederHer('/profil', 'popstate')).toBe(false);
		expect(stellStandWiederHer('/hilfe', 'link')).toBe(false);
	});

	it('vergisst die Scrollpositionen beim Weg zum Login', () => {
		expect(vergisstStand('/login')).toBe(true);
		expect(vergisstStand('/login/mail')).toBe(true);
		expect(vergisstStand('/willkommen')).toBe(true);
		expect(vergisstStand('/')).toBe(false);
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
