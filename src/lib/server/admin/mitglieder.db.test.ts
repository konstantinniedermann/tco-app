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
import { ladeVerlauf, schreibeVerlauf } from './verlauf.ts';

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

	test('A-MITGLIED-07: gleiche Mitgliedernummer → vergeben (mitgliedernummer)', async () => {
		const n = nummer();
		await anlegen({ mitgliedernummer: n });
		const r = await legeMitgliedAn(db, urheber, angaben({ mitgliedernummer: n }), jetzt);
		expect(r).toEqual({ ergebnis: 'vergeben', feld: 'mitgliedernummer' });
	});
});

describe('Mitgliedernummer', () => {
	test('A-MITGLIED-07: gleiche Mitgliedernummer in anderer Gross-/Kleinschreibung → vergeben; gespeichert wie eingegeben', async () => {
		const n = `Ab${nummer()}`;
		const id = await anlegen({ mitgliedernummer: n });
		expect((await ladeMitglied(db, id, jetzt))!.angaben.mitgliedernummer).toBe(n);
		const r = await legeMitgliedAn(
			db,
			urheber,
			angaben({ mitgliedernummer: n.toUpperCase() }),
			jetzt
		);
		expect(r).toEqual({ ergebnis: 'vergeben', feld: 'mitgliedernummer' });
	});
});

describe('aendereAngaben', () => {
	test('gelöschtes Mitglied: nicht-gefunden, Felder bleiben leer', async () => {
		const m = await erfinde(db, { status: 'geloescht' });
		await db
			.update(mitglied)
			.set({ email: null, strasse: null, plz: null, ort: null })
			.where(eq(mitglied.id, m.mitgliedId));
		const vorher = angaben({ email: '', strasse: '', plz: '', ort: '' });
		const r = await aendereAngaben(db, urheber, m.mitgliedId, angaben(), vorher, jetzt);
		expect(r.ergebnis).toBe('nicht-gefunden');
		const [z] = await db.select().from(mitglied).where(eq(mitglied.id, m.mitgliedId));
		expect(z.email).toBeNull();
	});

	test('A-MITGLIED-02, FR-26: Bearbeiten schreibt je geändertem Feld einen Eintrag', async () => {
		const id = await anlegen();
		const d = await ladeMitglied(db, id, jetzt);
		const r = await aendereAngaben(
			db,
			urheber,
			id,
			{ ...d!.angaben, ort: 'Aarau', telefon: '+41 00 000 00 00' },
			d!.angaben,
			jetzt
		);
		expect(r).toEqual({ ergebnis: 'ok', geaendert: ['ort', 'telefon'], alteEmail: null });
		const verlauf = await ladeVerlauf(db, { mitgliedId: id, grenze: 10 });
		const felder = verlauf.filter((v) => v.aktion === 'feld-geaendert').map((v) => v.detail);
		expect(felder.sort()).toEqual(['ort', 'telefon']);
		expect(JSON.stringify(verlauf)).not.toContain('Aarau');
	});

	test('SI-09: aendereAngaben meldet die alte Adresse nur bei geänderter E-Mail', async () => {
		const id = await anlegen();
		const d = (await ladeMitglied(db, id, jetzt))!;
		const neueEmail = `neu-${randomUUID().slice(0, 8)}@example.org`;
		const mitEmail = await aendereAngaben(
			db,
			urheber,
			id,
			{ ...d.angaben, email: neueEmail },
			d.angaben,
			jetzt
		);
		expect(mitEmail).toEqual({ ergebnis: 'ok', geaendert: ['email'], alteEmail: d.angaben.email });

		const d2 = (await ladeMitglied(db, id, jetzt))!;
		const nurTelefon = await aendereAngaben(
			db,
			urheber,
			id,
			{ ...d2.angaben, telefon: '+41 00 000 00 02' },
			d2.angaben,
			jetzt
		);
		expect(nurTelefon).toEqual({ ergebnis: 'ok', geaendert: ['telefon'], alteEmail: null });
	});

	test('FR-26: Speichern ohne echte Änderung schreibt nichts', async () => {
		const id = await anlegen();
		const d = await ladeMitglied(db, id, jetzt);
		const r = await aendereAngaben(db, urheber, id, { ...d!.angaben }, d!.angaben, jetzt);
		expect(r).toEqual({ ergebnis: 'ok', geaendert: [], alteEmail: null });
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
			d!.angaben,
			jetzt
		);
		expect(r).toEqual({ ergebnis: 'vergeben', feld: 'email' });
	});

	test('A-MITGLIED-02: Stand seit dem Laden geändert → veraltet, nichts gespeichert, kein Eintrag', async () => {
		const id = await anlegen();
		const geladen = (await ladeMitglied(db, id, jetzt))!.angaben;
		// Admin A speichert eine neue Adresse …
		const a = await aendereAngaben(db, urheber, id, { ...geladen, ort: 'Aarau' }, geladen, jetzt);
		expect(a).toEqual({ ergebnis: 'ok', geaendert: ['ort'], alteEmail: null });
		// … Admin B hat noch den alten Stand und ändert das Telefon.
		const b = await aendereAngaben(
			db,
			urheber,
			id,
			{ ...geladen, telefon: '+41 00 000 00 01' },
			geladen,
			jetzt
		);
		expect(b).toEqual({ ergebnis: 'veraltet' });
		const jetztStand = (await ladeMitglied(db, id, jetzt))!;
		expect(jetztStand.angaben).toMatchObject({ ort: 'Aarau', telefon: null });
		expect(jetztStand.verlauf.map((v) => v.detail)).toEqual(['ort', null]);
	});

	test('A-MITGLIED-02: mit dem neuen Stand gelingt das Speichern wieder', async () => {
		const id = await anlegen();
		const geladen = (await ladeMitglied(db, id, jetzt))!.angaben;
		await aendereAngaben(db, urheber, id, { ...geladen, ort: 'Aarau' }, geladen, jetzt);
		const neu = (await ladeMitglied(db, id, jetzt))!.angaben;
		const r = await aendereAngaben(
			db,
			urheber,
			id,
			{ ...neu, telefon: '+41 00 000 00 01' },
			neu,
			jetzt
		);
		expect(r).toEqual({ ergebnis: 'ok', geaendert: ['telefon'], alteEmail: null });
	});

	test('A-MITGLIED-07: Mitgliedernummer eines anderen in anderer Schreibweise → vergeben', async () => {
		const n = `A${nummer()}`;
		await anlegen({ mitgliedernummer: n });
		const id = await anlegen();
		const d = (await ladeMitglied(db, id, jetzt))!;
		const r = await aendereAngaben(
			db,
			urheber,
			id,
			{ ...d.angaben, mitgliedernummer: n.toLowerCase() },
			d.angaben,
			jetzt
		);
		expect(r).toEqual({ ergebnis: 'vergeben', feld: 'mitgliedernummer' });
	});

	test('unbekannte ID → nicht-gefunden', async () => {
		expect(await aendereAngaben(db, urheber, 2147483000, angaben(), angaben(), jetzt)).toEqual({
			ergebnis: 'nicht-gefunden'
		});
		expect(await ladeMitglied(db, 2147483000, jetzt)).toBeNull();
	});
});

describe('listeMitglieder', () => {
	test('Suche findet den Rufname; die Zeile bleibt amtlich', async () => {
		const u = randomUUID().slice(0, 8);
		const m = await erfinde(db, { vorname: 'Johannes', rufname: `Hannes${u}`, nachname: 'Muster' });
		const zeilen = await listeMitglieder(db, { suche: `hannes${u}` }, jetzt);
		expect(zeilen.map((z) => z.id)).toEqual([m.mitgliedId]);
		expect(zeilen[0].name).toBe('Muster, Johannes');
	});

	test('Detail liefert den Rufname ausserhalb der Angaben', async () => {
		const m = await erfinde(db, { vorname: 'Johannes', rufname: 'Hannes', nachname: 'Muster' });
		const d = (await ladeMitglied(db, m.mitgliedId, jetzt))!;
		expect(d.rufname).toBe('Hannes');
		expect(d.angaben).not.toHaveProperty('rufname');
		const o = await erfinde(db, {});
		expect((await ladeMitglied(db, o.mitgliedId, jetzt))!.rufname).toBeNull();
	});

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

	test('A-MITGLIED-02: Suche nach «Nachname, Vorname» findet das Mitglied', async () => {
		const u = randomUUID().slice(0, 8);
		const id = await anlegen({ vorname: 'Erika', nachname: `Beispiel${u}` });
		const ids = async (suche: string) =>
			(await listeMitglieder(db, { suche }, jetzt)).map((z) => z.id);
		expect(await ids(`Beispiel${u}, Erika`)).toEqual([id]);
		expect(await ids(`beispiel${u}, erika`)).toEqual([id]);
		expect(await ids(`Beispiel${u}, Kurt`)).toEqual([]);
	});

	test('Filter «vorgemerkt» findet das vorgemerkte Mitglied; ohne Filter erscheint es', async () => {
		const u = randomUUID().slice(0, 8);
		const id = await anlegen({ nachname: `Vorg${u}` });
		await db
			.update(mitglied)
			.set({ status: 'vorgemerkt', vorgemerktAm: jetzt, statusVorher: 'aktiv' })
			.where(eq(mitglied.id, id));
		const mit = await listeMitglieder(db, { suche: u, status: 'vorgemerkt' }, jetzt);
		expect(mit.map((x) => [x.id, x.status])).toEqual([[id, 'vorgemerkt']]);
		expect((await listeMitglieder(db, { suche: u }, jetzt)).map((x) => x.id)).toEqual([id]);
		expect(await listeMitglieder(db, { suche: u, status: 'aktiv' }, jetzt)).toEqual([]);
	});

	test('Gelöschte erscheinen in keiner Liste, auch nicht mit Filter «geloescht» (Konto fehlt)', async () => {
		const u = randomUUID().slice(0, 8);
		const id = await anlegen({ nachname: `Weg${u}` });
		// Wie der Löschlauf: nur der Name bleibt, das Konto ist weg.
		await db
			.update(mitglied)
			.set({ status: 'geloescht', email: null, strasse: null, plz: null, ort: null })
			.where(eq(mitglied.id, id));
		await db.delete(konto).where(eq(konto.mitgliedId, id));
		expect(await listeMitglieder(db, { suche: u }, jetzt)).toEqual([]);
		// Die Liste verbindet Mitglied und Konto: ohne Konto keine Zeile. Die Oberfläche hat
		// keinen Filter «gelöscht».
		expect(await listeMitglieder(db, { suche: u, status: 'geloescht' }, jetzt)).toEqual([]);
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

describe('Verlauf im Detail', () => {
	test('A-MITGLIED-06: zeigt höchstens die letzten 50 Einträge und meldet, wenn gekürzt', async () => {
		const id = await anlegen();
		const sitzungenBeendet = (anzahl: number) =>
			schreibeVerlauf(
				db,
				id,
				urheber,
				Array.from({ length: anzahl }, () => ({ aktion: 'sitzungen-beendet' as const })),
				jetzt
			);
		// «angelegt» + 49 = 50 Einträge: alles sichtbar
		await sitzungenBeendet(49);
		const voll = (await ladeMitglied(db, id, jetzt))!;
		expect([voll.verlauf.length, voll.verlaufGekuerzt]).toEqual([50, false]);
		await sitzungenBeendet(1);
		const gekuerzt = (await ladeMitglied(db, id, jetzt))!;
		expect([gekuerzt.verlauf.length, gekuerzt.verlaufGekuerzt]).toEqual([50, true]);
	});
});

describe('beendeSitzungenVon', () => {
	test('gelöschtes Mitglied: nicht-gefunden, nichts wird geschrieben', async () => {
		const m = await erfinde(db, { status: 'geloescht' });
		expect(await beendeSitzungenVon(db, urheber, m.mitgliedId, jetzt)).toBe('nicht-gefunden');
		expect(await ladeVerlauf(db, { mitgliedId: m.mitgliedId, grenze: 5 })).toEqual([]);
	});

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
