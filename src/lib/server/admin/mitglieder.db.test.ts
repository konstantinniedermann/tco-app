import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn as erfinde } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { konto, mitglied, sitzung } from '../db/schema.ts';
import { erstelleSitzung } from '../login/sitzung.ts';
import type { Angaben } from './angaben.ts';
import {
	aendereAngaben,
	beendeSitzungenVon,
	ladeMitglied,
	legeMitgliedAn,
	listeMitglieder
} from './mitglieder.ts';
import { ladeVerlauf } from './verlauf.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

const jetzt = new Date('2026-11-02T12:00:00Z');
const MIN = 60 * 1000;
const urheber = { art: 'automatisch' } as const;

function angaben(teil: Partial<Angaben> = {}): Angaben {
	const u = randomUUID().slice(0, 8);
	return {
		mitgliedernummer: null,
		vorname: 'Vera',
		nachname: `Zeta${u}`,
		strasse: 'Erfundenweg 1',
		plz: '4600',
		ort: 'Olten',
		email: `neu-${u}@example.org`,
		telefon: null,
		geschlecht: null,
		jahrgang: null,
		lizenznummer: null,
		...teil
	};
}

const nummer = () => randomUUID().replace(/-/g, '').slice(0, 12);

async function anlegen(teil: Partial<Angaben> = {}) {
	const r = await legeMitgliedAn(db, urheber, angaben(teil), jetzt);
	if (r.ergebnis !== 'ok') throw new Error('Anlegen fehlgeschlagen');
	return r.id;
}

describe('legeMitgliedAn', () => {
	test('A-MITGLIED-01, FR-01: Admin legt Mitglied mit Konto an, ohne Brief-Code, Verlauf «angelegt»', async () => {
		const id = await anlegen();
		const [k] = await db.select().from(konto).where(eq(konto.mitgliedId, id));
		expect(k.briefCodeHash).toBeNull();
		const verlauf = await ladeVerlauf(db, { mitgliedId: id, grenze: 10 });
		expect(verlauf.map((v) => v.aktion)).toEqual(['angelegt']);
		const d = await ladeMitglied(db, id, jetzt);
		expect(d?.status).toBe('aktiv');
		expect(d?.login.stand).toBe('ohne-brief');
	});

	test('FR-25: gleiche E-Mail in anderer Schreibweise → vergeben (email)', async () => {
		const a = angaben();
		await legeMitgliedAn(db, urheber, a, jetzt);
		const r = await legeMitgliedAn(db, urheber, angaben({ email: a.email.toUpperCase() }), jetzt);
		expect(r).toEqual({ ergebnis: 'vergeben', feld: 'email' });
	});

	test('FR-25: gleiche Mitgliedernummer → vergeben (mitgliedernummer)', async () => {
		const n = nummer();
		await anlegen({ mitgliedernummer: n });
		const r = await legeMitgliedAn(db, urheber, angaben({ mitgliedernummer: n }), jetzt);
		expect(r).toEqual({ ergebnis: 'vergeben', feld: 'mitgliedernummer' });
	});
});

describe('aendereAngaben', () => {
	test('A-MITGLIED-02, FR-26: Bearbeiten schreibt je geändertem Feld einen Eintrag', async () => {
		const id = await anlegen();
		const d = await ladeMitglied(db, id, jetzt);
		const r = await aendereAngaben(
			db,
			urheber,
			id,
			{ ...d!.angaben, ort: 'Aarau', telefon: '+41 00 000 00 00' },
			jetzt
		);
		expect(r).toEqual({ ergebnis: 'ok', geaendert: ['ort', 'telefon'] });
		const verlauf = await ladeVerlauf(db, { mitgliedId: id, grenze: 10 });
		const felder = verlauf.filter((v) => v.aktion === 'feld-geaendert').map((v) => v.detail);
		expect(felder.sort()).toEqual(['ort', 'telefon']);
		expect(JSON.stringify(verlauf)).not.toContain('Aarau');
	});

	test('FR-26: Speichern ohne echte Änderung schreibt nichts', async () => {
		const id = await anlegen();
		const d = await ladeMitglied(db, id, jetzt);
		const r = await aendereAngaben(db, urheber, id, { ...d!.angaben }, jetzt);
		expect(r).toEqual({ ergebnis: 'ok', geaendert: [] });
		const verlauf = await ladeVerlauf(db, { mitgliedId: id, grenze: 10 });
		expect(verlauf.map((v) => v.aktion)).toEqual(['angelegt']);
	});

	test('FR-25: E-Mail eines anderen Mitglieds in anderer Schreibweise → vergeben', async () => {
		const fremd = angaben();
		await legeMitgliedAn(db, urheber, fremd, jetzt);
		const id = await anlegen();
		const d = await ladeMitglied(db, id, jetzt);
		const r = await aendereAngaben(
			db,
			urheber,
			id,
			{ ...d!.angaben, email: fremd.email.toUpperCase() },
			jetzt
		);
		expect(r).toEqual({ ergebnis: 'vergeben', feld: 'email' });
	});

	test('unbekannte ID → nicht-gefunden', async () => {
		expect(await aendereAngaben(db, urheber, 2147483000, angaben(), jetzt)).toEqual({
			ergebnis: 'nicht-gefunden'
		});
		expect(await ladeMitglied(db, 2147483000, jetzt)).toBeNull();
	});
});

describe('listeMitglieder', () => {
	test('Suche findet Teil von Name, E-Mail und Nummer; «100%» sucht wörtlich', async () => {
		const u = randomUUID().slice(0, 8);
		const n = nummer();
		const a = await anlegen({ nachname: `Suchbar${u}`, mitgliedernummer: n });
		const b = await anlegen({ nachname: `Prozent${u}100%` });
		const c = await anlegen({ nachname: `Prozent${u}100X` });
		const ids = async (suche: string) =>
			(await listeMitglieder(db, { suche }, jetzt)).map((z) => z.id);
		expect(await ids(`suchbar${u}`)).toEqual([a]);
		expect(await ids(n.slice(2, 9))).toEqual([a]);
		const d = await ladeMitglied(db, a, jetzt);
		expect(await ids(d!.angaben.email.toUpperCase())).toEqual([a]);
		expect(await ids(`${u}100%`)).toEqual([b]);
		expect((await ids(`Prozent${u}`)).sort()).toEqual([b, c].sort());
		const zeile = (await listeMitglieder(db, { suche: `suchbar${u}` }, jetzt))[0];
		expect(zeile.name).toBe(`Suchbar${u}, Vera`);
	});

	test('Liste ohne Statusfilter blendet gelöschte aus, mit Filter zeigt sie', async () => {
		const u = randomUUID().slice(0, 8);
		const id = await anlegen({ nachname: `Weg${u}` });
		await db.update(mitglied).set({ status: 'geloescht' }).where(eq(mitglied.id, id));
		expect(await listeMitglieder(db, { suche: u }, jetzt)).toEqual([]);
		const z = await listeMitglieder(db, { suche: u, status: 'geloescht' }, jetzt);
		expect(z.map((x) => x.id)).toEqual([id]);
	});

	test('Liste zeigt Login-Stand: ohne-brief, brief-offen, eingeloggt, gesperrt', async () => {
		const ohne = await erfinde(db);
		const offen = await erfinde(db);
		const drin = await erfinde(db);
		const gesperrt = await erfinde(db, { gesperrt: true });
		await db
			.update(konto)
			.set({ briefCodeHash: 'h' + randomUUID(), briefCodeAblauf: new Date(jetzt.getTime() + MIN) })
			.where(eq(konto.id, offen.kontoId));
		await erstelleSitzung(db, drin.kontoId, jetzt);
		const stand = async (m: { email: string }, zeit = jetzt) =>
			(await listeMitglieder(db, { suche: m.email }, zeit))[0].login;
		expect(await stand(ohne)).toBe('ohne-brief');
		expect(await stand(offen)).toBe('brief-offen');
		expect(await stand(drin)).toBe('eingeloggt');
		expect(await stand(gesperrt)).toBe('gesperrt');
		// benutzter Brief-Code zählt nicht als offen
		await db.update(konto).set({ briefCodeBenutztAm: jetzt }).where(eq(konto.id, offen.kontoId));
		expect(await stand(offen)).toBe('ohne-brief');
		// abgelaufene Sitzung zählt nicht als eingeloggt
		expect(await stand(drin, new Date(jetzt.getTime() + 400 * 24 * 60 * MIN))).toBe('ohne-brief');
	});

	test('Detail: Rollen, Geräte und zuletzt genutzt', async () => {
		const m = await erfinde(db, { rollen: ['cm'] });
		await erstelleSitzung(db, m.kontoId, jetzt);
		await erstelleSitzung(db, m.kontoId, new Date(jetzt.getTime() + MIN));
		const d = await ladeMitglied(db, m.mitgliedId, new Date(jetzt.getTime() + 2 * MIN));
		expect(d?.rollen).toEqual(['cm']);
		expect(d?.login.geraete).toBe(2);
		expect(d?.login.zuletztGenutzt).toEqual(new Date(jetzt.getTime() + MIN));
		expect(d?.kontoId).toBe(m.kontoId);
	});
});

describe('beendeSitzungenVon', () => {
	test('SI-07, FR-24: Sitzungen beenden erhöht die Sitzungsversion, Verlauf «sitzungen-beendet»', async () => {
		const m = await erfinde(db);
		await erstelleSitzung(db, m.kontoId, jetzt);
		const [vorher] = await db.select().from(konto).where(eq(konto.id, m.kontoId));
		expect(await beendeSitzungenVon(db, urheber, m.mitgliedId, jetzt)).toBe('ok');
		const [nachher] = await db.select().from(konto).where(eq(konto.id, m.kontoId));
		expect(nachher.sitzungsversion).toBe(vorher.sitzungsversion + 1);
		expect(await db.select().from(sitzung).where(eq(sitzung.kontoId, m.kontoId))).toEqual([]);
		const verlauf = await ladeVerlauf(db, { mitgliedId: m.mitgliedId, grenze: 5 });
		expect(verlauf.map((v) => v.aktion)).toEqual(['sitzungen-beendet']);
		expect(await beendeSitzungenVon(db, urheber, 2147483000, jetzt)).toBe('nicht-gefunden');
	});
});
