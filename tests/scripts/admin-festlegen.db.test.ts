import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { festlegen, starte } from '../../scripts/admin-festlegen.ts';
import {
	ERFUNDENE_MITGLIEDER,
	legeErfundeneMitgliederAn
} from '../../scripts/erfundene-mitglieder.ts';
import { machAdmin } from '../../src/lib/server/admin/erster-admin.ts';
import { ladeRollen } from '../../src/lib/server/admin/rollen.ts';
import { erstelleDb, type Db } from '../../src/lib/server/db/index.ts';
import { konto, mitglied } from '../../src/lib/server/db/schema.ts';
import { legeEigeneDatenbankAn, type EigeneDatenbank } from '../hilfen/eigene-datenbank.ts';

let eigene: EigeneDatenbank | undefined;
let db: Db;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('admin_befehl');
	db = eigene.db;
});

afterAll(async () => {
	await eigene?.abbauen();
});

let ausgabe: string[];

beforeEach(() => {
	ausgabe = [];
	process.exitCode = undefined;
	const merke = (...teile: unknown[]) => void ausgabe.push(teile.join(' '));
	vi.spyOn(console, 'log').mockImplementation(merke);
	vi.spyOn(console, 'error').mockImplementation(merke);
});

afterEach(() => {
	vi.restoreAllMocks();
	process.exitCode = undefined;
});

// Erfundene, unverwechselbare Werte: keiner davon darf je in der Ausgabe stehen.
const WERTE = {
	mitgliedernummer: '7391847',
	vorname: 'Zirkonia',
	strasse: 'Quellenstrasse 9917',
	plz: '4600',
	ort: 'Ortschaftx',
	email: 'zirkonia.q@example.org'
};

function args(werte: Record<string, string>): string[] {
	return Object.entries(werte).flatMap(([k, v]) => [`--${k}`, v]);
}

function keineWerteInAusgabe(werte: string[]) {
	for (const zeile of ausgabe) for (const wert of werte) expect(zeile).not.toContain(wert);
}

describe('Befehl admin-festlegen', () => {
	test('DS-06, SI-05: ungültige Angaben → nur Feldnamen mit Grund, keine Werte, Exit 1', async () => {
		// nachname fehlt, E-Mail ist ungültig
		await festlegen(args({ ...WERTE, email: 'zirkonia-ohne-at' }), db);
		expect(process.exitCode).toBe(1);
		expect(ausgabe.join('\n')).toContain('nachname: fehlt');
		expect(ausgabe.join('\n')).toMatch(/email: /);
		keineWerteInAusgabe([...Object.values(WERTE).filter((w) => w !== '4600'), 'zirkonia-ohne-at']);
		expect(await db.select().from(mitglied).where(eq(mitglied.vorname, WERTE.vorname))).toEqual([]);
	});

	test('DS-06: unbekannte Option → fester Text ohne den übergebenen Wert, Exit 1', async () => {
		await festlegen(['--geheimwert-xyz', 'Wertqq123'], db);
		expect(process.exitCode).toBe(1);
		expect(ausgabe).toHaveLength(1);
		expect(ausgabe[0]).toContain('admin: ungültige Angaben');
		keineWerteInAusgabe(['geheimwert-xyz', 'Wertqq123']);
	});

	test('DS-06: Datenbankfehler → fester Text ohne Werte, Exit 1', async () => {
		const kaputt = erstelleDb('postgres://x:y@127.0.0.1:1/keine');
		try {
			await festlegen(args({ ...WERTE, nachname: 'Nachnamex' }), kaputt);
		} finally {
			await kaputt.$client.end().catch(() => {});
		}
		expect(process.exitCode).toBe(1);
		expect(ausgabe).toEqual(['admin: abgebrochen']);
	});

	test('DS-06: Widerspruch zwischen Nummer und E-Mail → Feldnamen, keine Werte, Exit 1', async () => {
		const [m] = await db
			.insert(mitglied)
			.values({
				...WERTE,
				mitgliedernummer: '5550001',
				nachname: 'Vorhanden',
				email: 'vorhanden.q@example.org'
			})
			.returning({ id: mitglied.id });
		await db.insert(konto).values({ mitgliedId: m.id });
		await festlegen(args({ ...WERTE, nachname: 'Nachnamex', mitgliedernummer: '5550001' }), db);
		expect(process.exitCode).toBe(1);
		expect(ausgabe.join('\n')).toContain('mitgliedernummer: passt nicht zur E-Mail');
		keineWerteInAusgabe(['5550001', 'vorhanden.q', 'zirkonia.q', 'Nachnamex']);
	});

	test('DATABASE_URL fehlt → fester Text, Exit 1', async () => {
		await starte([], {});
		expect(process.exitCode).toBe(1);
		expect(ausgabe).toEqual(['admin: DATABASE_URL fehlt']);
	});

	test('A-ROLLE-02: Erfolg → Ergebnis ausgegeben, Exit-Code unverändert, keine Werte', async () => {
		await festlegen(args({ ...WERTE, nachname: 'Nachnamex' }), db);
		expect(process.exitCode).toBeUndefined();
		expect(ausgabe).toEqual([
			'admin: Mitglied angelegt, Rollen MyTCO-Admin und Mitglieder-Admin vergeben'
		]);
		keineWerteInAusgabe(['7391847', 'Zirkonia', 'Nachnamex', 'zirkonia.q']);

		await festlegen(args({ ...WERTE, nachname: 'Nachnamex' }), db);
		expect(ausgabe.at(-1)).toBe('admin: Mitglied war schon MyTCO-Admin, nichts geändert');
		expect(process.exitCode).toBeUndefined();
	});
});

describe('Testdaten', () => {
	test('testdaten: Erika Beispiel ist auf Test MyTCO-Admin und Mitglieder-Admin', async () => {
		// Wie ladeTestdaten in scripts/testdaten.ts: anlegen, dann das erste Mitglied zum Admin machen.
		const kontoIds = await legeErfundeneMitgliederAn(db);
		await machAdmin(db, kontoIds[0], new Date());
		expect(ERFUNDENE_MITGLIEDER[0]).toMatchObject({ vorname: 'Erika', nachname: 'Beispiel' });
		expect((await ladeRollen(db, kontoIds[0])).sort()).toEqual(['mitglieder', 'mytco']);
		expect(await ladeRollen(db, kontoIds[1])).toEqual([]);
	});
});
