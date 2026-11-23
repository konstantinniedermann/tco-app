import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	ausAdresse,
	filtere,
	hatTabellenwerte,
	inAdresse,
	klemme,
	ladeBreiten,
	naechsteSortierung,
	sortiere,
	speichereBreiten,
	type Spalte
} from './tabelle.ts';
import { erinnere, merke } from './tabellen-gedaechtnis.ts';

type Z = {
	name: string | null;
	nummer: string | null;
	jahrgang: number | null;
	rollen: string[];
	konto: string;
};

const z = (
	name: string | null,
	nummer: string | null,
	jahrgang: number | null,
	rollen: string[] = [],
	konto = 'aktiv'
): Z => ({
	name,
	nummer,
	jahrgang,
	rollen,
	konto
});

const SPALTEN: Spalte<Z>[] = [
	{
		schluessel: 'nummer',
		titel: 'Nummer',
		sortwert: (r) => r.nummer,
		filter: { art: 'text' },
		filterwert: (r) => r.nummer,
		breite: { start: 6.5, min: 5, max: 12 }
	},
	{
		schluessel: 'name',
		titel: 'Name',
		sortwert: (r) => r.name,
		filter: { art: 'text' },
		filterwert: (r) => r.name,
		breite: { start: 13, min: 8, max: 30 }
	},
	{
		schluessel: 'jahrgang',
		titel: 'Jahrgang',
		sortwert: (r) => r.jahrgang,
		filter: { art: 'bereich', zahl: 'ganz' },
		filterwert: (r) => r.jahrgang,
		breite: { start: 7.5, min: 6, max: 12 }
	},
	{
		schluessel: 'rollen',
		titel: 'Rollen',
		sortwert: (r) => r.rollen.join(', '),
		filter: {
			art: 'werte',
			werte: [
				{ wert: 'mitglieder', text: 'Mitglieder-Admin' },
				{ wert: 'cm', text: 'CM-Admin' }
			]
		},
		filterwert: (r) => r.rollen,
		breite: { start: 12, min: 8, max: 25 }
	},
	{
		schluessel: 'konto',
		titel: 'Konto',
		sortwert: (r) => r.konto,
		filter: {
			art: 'werte',
			werte: [
				{ wert: 'aktiv', text: 'aktiv' },
				{ wert: 'brief-offen', text: 'Brief offen' },
				{ wert: 'ohne-brief', text: 'ohne Brief' }
			]
		},
		filterwert: (r) => r.konto,
		breite: { start: 9, min: 7, max: 15 }
	},
	{ schluessel: 'aktion', titel: 'Aktion', breite: { start: 7, min: 7, max: 7 } }
];

const namen = (zeilen: Z[]) => zeilen.map((r) => r.name);

describe('sortiere', () => {
	const zeilen = [
		z('Zürcher', '1047', 1990),
		z('Ammann', '988', null),
		z('Äbi', null, 1960),
		z(null, '5', 2001)
	];

	it('sortiert nach de-CH, Zahlen als Zahl, leere Werte zuletzt in beide Richtungen', () => {
		expect(namen(sortiere(zeilen, SPALTEN, { spalte: 'name', richtung: 'auf' }))).toEqual([
			'Äbi',
			'Ammann',
			'Zürcher',
			null
		]);
		expect(namen(sortiere(zeilen, SPALTEN, { spalte: 'name', richtung: 'ab' }))).toEqual([
			'Zürcher',
			'Ammann',
			'Äbi',
			null
		]);
		expect(
			sortiere(zeilen, SPALTEN, { spalte: 'nummer', richtung: 'auf' }).map((r) => r.nummer)
		).toEqual(['5', '988', '1047', null]);
		expect(
			sortiere(zeilen, SPALTEN, { spalte: 'jahrgang', richtung: 'ab' }).map((r) => r.jahrgang)
		).toEqual([2001, 1990, 1960, null]);
	});

	it('ohne Sortierung oder mit unbekannter Spalte bleibt die Reihenfolge des Servers', () => {
		expect(sortiere(zeilen, SPALTEN, null)).toEqual(zeilen);
		expect(sortiere(zeilen, SPALTEN, { spalte: 'aktion', richtung: 'auf' })).toEqual(zeilen);
		expect(sortiere(zeilen, SPALTEN, { spalte: 'gibts-nicht', richtung: 'auf' })).toEqual(zeilen);
	});

	it('ist stabil bei gleichen Werten', () => {
		const gleich = [z('B', '1', 1990), z('A', '2', 1990), z('C', '3', 1990)];
		expect(namen(sortiere(gleich, SPALTEN, { spalte: 'jahrgang', richtung: 'ab' }))).toEqual([
			'B',
			'A',
			'C'
		]);
	});
});

describe('filtere', () => {
	const zeilen = [
		z('Keller, Thomas', '988', 2008, ['cm']),
		z('Wyss, Heidi', '1047', 2014, [], 'brief-offen'),
		z('Frey, Luca', '1455', 2015, ['mitglieder', 'cm'], 'ohne-brief'),
		z('Imhof, Mia', null, null, [], 'ohne-brief')
	];

	it('filtert Text enthält ohne Gross/Klein, Bereich inklusiv, Werte mit Schnittmenge', () => {
		expect(namen(filtere(zeilen, SPALTEN, { name: { art: 'text', text: 'KEL' } }))).toEqual([
			'Keller, Thomas'
		]);
		expect(
			namen(filtere(zeilen, SPALTEN, { jahrgang: { art: 'bereich', von: '2008', bis: '2014' } }))
		).toEqual(['Keller, Thomas', 'Wyss, Heidi']);
		expect(
			namen(filtere(zeilen, SPALTEN, { jahrgang: { art: 'bereich', von: '2010', bis: null } }))
		).toEqual(['Wyss, Heidi', 'Frey, Luca']);
		expect(namen(filtere(zeilen, SPALTEN, { rollen: { art: 'werte', werte: ['cm'] } }))).toEqual([
			'Keller, Thomas',
			'Frey, Luca'
		]);
		expect(
			namen(
				filtere(zeilen, SPALTEN, { konto: { art: 'werte', werte: ['brief-offen', 'ohne-brief'] } })
			)
		).toEqual(['Wyss, Heidi', 'Frey, Luca', 'Imhof, Mia']);
	});

	it('verbindet mehrere Filter mit und; leere Werte treffen nie einen Text- oder Bereichsfilter', () => {
		expect(
			namen(
				filtere(zeilen, SPALTEN, {
					konto: { art: 'werte', werte: ['ohne-brief'] },
					rollen: { art: 'werte', werte: ['cm'] }
				})
			)
		).toEqual(['Frey, Luca']);
		expect(
			filtere(zeilen, SPALTEN, { nummer: { art: 'text', text: '1' } }).map((r) => r.nummer)
		).toEqual(['1047', '1455']);
		expect(
			filtere(zeilen, SPALTEN, { jahrgang: { art: 'bereich', von: null, bis: '3000' } })
		).toHaveLength(3);
	});

	it('leere Filter und Filter auf unbekannte Spalten wirken nicht', () => {
		expect(filtere(zeilen, SPALTEN, { name: { art: 'text', text: '  ' } })).toHaveLength(4);
		expect(filtere(zeilen, SPALTEN, { konto: { art: 'werte', werte: [] } })).toHaveLength(4);
		expect(filtere(zeilen, SPALTEN, { xyz: { art: 'text', text: 'a' } })).toHaveLength(4);
	});
});

describe('naechsteSortierung', () => {
	it('keine → auf → ab → auf, andere Spalte → auf', () => {
		const auf = naechsteSortierung(null, 'name');
		expect(auf).toEqual({ spalte: 'name', richtung: 'auf' });
		const ab = naechsteSortierung(auf, 'name');
		expect(ab).toEqual({ spalte: 'name', richtung: 'ab' });
		expect(naechsteSortierung(ab, 'name')).toEqual({ spalte: 'name', richtung: 'auf' });
		expect(naechsteSortierung(ab, 'jahrgang')).toEqual({ spalte: 'jahrgang', richtung: 'auf' });
	});
});

describe('Adresse', () => {
	it('Adresse hin und zurück ohne Text', () => {
		const q = inAdresse(
			new URLSearchParams('mitglied=5'),
			SPALTEN,
			{ spalte: 'jahrgang', richtung: 'auf' },
			{
				name: { art: 'text', text: 'Keller' },
				konto: { art: 'werte', werte: ['brief-offen', 'ohne-brief'] },
				jahrgang: { art: 'bereich', von: '2008', bis: '2014' }
			}
		);
		expect(q.get('name')).toBeNull();
		expect(q.get('konto')).toBe('brief-offen,ohne-brief');
		expect(q.get('jahrgang')).toBe('2008..2014');
		expect(q.get('sort')).toBe('jahrgang');
		expect(q.get('richtung')).toBeNull();
		expect(q.get('mitglied')).toBe('5');
		expect(q.toString()).not.toContain('Keller');
		expect(ausAdresse(q, SPALTEN)).toEqual({
			sortierung: { spalte: 'jahrgang', richtung: 'auf' },
			filter: {
				konto: { art: 'werte', werte: ['brief-offen', 'ohne-brief'] },
				jahrgang: { art: 'bereich', von: '2008', bis: '2014' }
			}
		});
		expect(hatTabellenwerte(q, SPALTEN)).toBe(true);
		expect(hatTabellenwerte(new URLSearchParams('mitglied=5'), SPALTEN)).toBe(false);
	});

	it('schreibt absteigend, halbe Bereiche und entfernt eigene leere Werte', () => {
		const q = inAdresse(
			new URLSearchParams('konto=aktiv&sort=name'),
			SPALTEN,
			{ spalte: 'name', richtung: 'ab' },
			{ jahrgang: { art: 'bereich', von: '2008', bis: null } }
		);
		expect(q.get('konto')).toBeNull();
		expect(q.get('richtung')).toBe('ab');
		expect(q.get('jahrgang')).toBe('2008..');
		expect(ausAdresse(q, SPALTEN).filter).toEqual({
			jahrgang: { art: 'bereich', von: '2008', bis: null }
		});
		const leer = inAdresse(q, SPALTEN, null, {});
		expect(leer.toString()).toBe('');
	});

	it('kaputte Adresse wird ignoriert', () => {
		const q = new URLSearchParams(
			'sort=xyz&richtung=quer&konto=foo,aktiv&jahrgang=abc..2014&name=Keller&rollen='
		);
		expect(ausAdresse(q, SPALTEN)).toEqual({
			sortierung: null,
			filter: {
				konto: { art: 'werte', werte: ['aktiv'] },
				jahrgang: { art: 'bereich', von: null, bis: '2014' }
			}
		});
		expect(ausAdresse(new URLSearchParams('sort=aktion&jahrgang=..'), SPALTEN)).toEqual({
			sortierung: null,
			filter: {}
		});
		expect(ausAdresse(new URLSearchParams('sort=name&richtung=quer'), SPALTEN).sortierung).toEqual({
			spalte: 'name',
			richtung: 'auf'
		});
	});

	it('Datumsbereich nimmt nur gültige ISO-Tage', () => {
		const zeit: Spalte<Z>[] = [
			{
				schluessel: 'zeit',
				titel: 'Zeit',
				filter: { art: 'bereich', zahl: 'datum' },
				breite: { start: 12, min: 8, max: 16 }
			}
		];
		expect(ausAdresse(new URLSearchParams('zeit=2026-10-01..2026-13-01'), zeit).filter).toEqual({
			zeit: { art: 'bereich', von: '2026-10-01', bis: null }
		});
	});
});

describe('Breiten', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const speicher = (getItem: () => string | null) => {
		const gesetzt: Record<string, string> = {};
		vi.stubGlobal('localStorage', {
			getItem,
			setItem: (k: string, v: string) => {
				gesetzt[k] = v;
			}
		});
		return gesetzt;
	};

	it('klemmt auf Min und Max', () => {
		expect(klemme(3, { start: 6, min: 5, max: 12 })).toBe(5);
		expect(klemme(20, { start: 6, min: 5, max: 12 })).toBe(12);
		expect(klemme(7.5, { start: 6, min: 5, max: 12 })).toBe(7.5);
	});

	it('Breiten: klemmen, kaputter Speicher und Ausnahme ergeben Start', () => {
		speicher(() => '{kaputt');
		expect(ladeBreiten('mitglieder', SPALTEN).name).toBe(13);
		speicher(() => JSON.stringify({ name: 99, nummer: 'x', jahrgang: 8 }));
		const b = ladeBreiten('mitglieder', SPALTEN);
		expect(b).toMatchObject({ name: 30, nummer: 6.5, jahrgang: 8, konto: 9 });
		speicher(() => {
			throw new Error('gesperrt');
		});
		expect(ladeBreiten('mitglieder', SPALTEN).name).toBe(13);
		vi.stubGlobal('localStorage', undefined);
		expect(ladeBreiten('mitglieder', SPALTEN).name).toBe(13);
	});

	it('speichert unter mytco.breiten.<tabelle> und schluckt Fehler', () => {
		const gesetzt = speicher(() => null);
		speichereBreiten('briefe', { name: 20 });
		expect(JSON.parse(gesetzt['mytco.breiten.briefe'])).toEqual({ name: 20 });
		vi.stubGlobal('localStorage', {
			setItem: () => {
				throw new Error('voll');
			}
		});
		expect(() => speichereBreiten('briefe', { name: 20 })).not.toThrow();
	});
});

describe('Gedächtnis', () => {
	it('gibt den letzten Stand je Tabelle zurück', () => {
		expect(erinnere('verlauf-test')).toBeUndefined();
		merke('verlauf-test', { sortierung: null, filter: { wer: { art: 'text', text: 'Studer' } } });
		merke('mitglieder-test', {
			sortierung: { spalte: 'name', richtung: 'ab' },
			filter: {},
			suche: 'kel'
		});
		expect(erinnere('verlauf-test')?.filter).toEqual({ wer: { art: 'text', text: 'Studer' } });
		expect(erinnere('mitglieder-test')?.suche).toBe('kel');
	});
});
