import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { testPruefer, type Antwort } from '../../../../tests/hilfen/passkey-pruefer.ts';
import { erstelleDb } from '../db/index.ts';
import { konto, mitglied, passkey, sitzung } from '../db/schema.ts';
import { erstelleBremsen } from './bremse.ts';
import { ChallengeSpeicher } from './challenge.ts';
import { erstelleLoginDienst } from './dienst.ts';
import type { Ort } from './passkey-pruefer.ts';
import { erstellePasskeyDienst } from './passkey.ts';
import { beendeAlleSitzungen, erstelleSitzung, pruefeSitzung } from './sitzung.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

const start = new Date('2026-11-02T12:00:00Z');
const MINUTE = 60_000;
const ORT: Ort = { rpId: 'mytco.example.org', herkunft: 'https://mytco.example.org' };
const ANDERER_ORT: Ort = { rpId: 'test.example.org', herkunft: 'https://test.example.org' };

function baue() {
	const zeit = { t: start };
	const bremsen = erstelleBremsen(() => zeit.t.getTime());
	const { pruefer, aufrufe } = testPruefer();
	const dienst = erstellePasskeyDienst({
		db,
		pruefer,
		bremsen,
		challenges: new ChallengeSpeicher({ jetzt: () => zeit.t.getTime() }),
		jetzt: () => zeit.t
	});
	return { dienst, zeit, aufrufe, bremsen };
}

type Aufbau = ReturnType<typeof baue>;
const challengeAus = (optionen: object) => (optionen as { challenge: string }).challenge;
const neueKennung = () => randomUUID().replaceAll('-', '');

/** Sitzung per Code (mit Hinweis), wie nach dem Brief- oder Mail-Code. */
const codeSitzung = (kontoId: number) =>
	erstelleSitzung(db, kontoId, start, undefined, { passkeyHinweis: true });

async function richteEin(
	d: Aufbau,
	kontoId: number,
	opt: { kennung?: string; ort?: Ort; geraet?: string; sitzungKennung?: string } = {}
) {
	const kennung = opt.kennung ?? neueKennung();
	const ort = opt.ort ?? ORT;
	const optionen = await d.dienst.optionenEinrichten(kontoId, ort);
	const antwort: Antwort = { id: kennung, ok: true, challenge: challengeAus(optionen) };
	const sitzungKennung = opt.sitzungKennung ?? (await codeSitzung(kontoId));
	const ergebnis = await d.dienst.einrichten(
		kontoId,
		antwort,
		ort,
		opt.geraet ?? 'iPhone',
		sitzungKennung
	);
	return { ergebnis, kennung };
}

async function meldeAn(d: Aufbau, kennung: string, ip = 'ip-1', ort: Ort = ORT) {
	const o = await d.dienst.optionenAnmelden(ort, ip);
	if (o === 'zu-viele') return { ergebnis: 'zu-viele' as const };
	const antwort: Antwort = { id: kennung, ok: true, challenge: challengeAus(o.optionen) };
	return d.dienst.anmelden(o.vorgang, antwort, ort, ip);
}

const passkeysVon = (kontoId: number) =>
	db.select().from(passkey).where(eq(passkey.kontoId, kontoId));
const sitzungenVon = (kontoId: number) =>
	db.select().from(sitzung).where(eq(sitzung.kontoId, kontoId));

describe('Passkey einrichten', () => {
	test('A-LOGIN-07: Passkey einrichten speichert Schlüssel, Gerät und rpId und beendet den Hinweis', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const sitzungKennung = await codeSitzung(kontoId);
		expect((await pruefeSitzung(db, sitzungKennung, start))?.konto.passkeyHinweis).toBe(true);

		const { ergebnis, kennung } = await richteEin(d, kontoId, {
			geraet: 'Android-Handy',
			sitzungKennung
		});

		expect(ergebnis).toBe('ok');
		const zeilen = await passkeysVon(kontoId);
		expect(zeilen).toHaveLength(1);
		expect(zeilen[0]).toMatchObject({
			kennung,
			oeffentlicherSchluessel: `schluessel-${kennung}`,
			zaehler: 0,
			transporte: ['internal', 'hybrid'],
			rpId: ORT.rpId,
			geraet: 'Android-Handy',
			eingerichtetAm: start,
			zuletztBenutzt: null
		});
		expect((await pruefeSitzung(db, sitzungKennung, start))?.konto.passkeyHinweis).toBe(false);
	});

	test('A-LOGIN-07: Optionen zum Einrichten schliessen vorhandene Passkeys derselben rpId aus', async () => {
		const d = baue();
		const { kontoId, email } = await legeMitgliedAn(db, { vorname: 'Erika' });
		const hier = await richteEin(d, kontoId);
		await richteEin(d, kontoId, { ort: ANDERER_ORT });

		await d.dienst.optionenEinrichten(kontoId, ORT);

		const [erster, zweiter, dritter] = d.aufrufe.einrichten;
		expect(dritter.vorhandene).toEqual([hier.kennung]);
		expect(dritter.name).toBe(email);
		expect(dritter.anzeigename).toBe('Erika Muster');
		// Die Konto-Kennung entsteht einmal und bleibt.
		const [k] = await db.select().from(konto).where(eq(konto.id, kontoId));
		expect(k.passkeyKennung).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect([erster.kontoKennung, zweiter.kontoKennung, dritter.kontoKennung]).toEqual([
			k.passkeyKennung,
			k.passkeyKennung,
			k.passkeyKennung
		]);
	});

	test('A-LOGIN-07: Einrichten ohne Optionen, mit falscher Antwort oder fremder Kennung ergibt falsch', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const sitzungKennung = await codeSitzung(kontoId);
		const id = neueKennung();

		// Keine Challenge vorhanden
		expect(
			await d.dienst.einrichten(kontoId, { id, ok: true }, ORT, 'iPhone', sitzungKennung)
		).toBe('falsch');

		// Prüfung scheitert
		let o = await d.dienst.optionenEinrichten(kontoId, ORT);
		const falsche: Antwort = { id, ok: false, challenge: challengeAus(o) };
		expect(await d.dienst.einrichten(kontoId, falsche, ORT, 'iPhone', sitzungKennung)).toBe(
			'falsch'
		);
		// Die Challenge ist verbraucht: ein zweiter Versuch damit gilt nicht.
		const nochmal: Antwort = { ...falsche, ok: true };
		expect(await d.dienst.einrichten(kontoId, nochmal, ORT, 'iPhone', sitzungKennung)).toBe(
			'falsch'
		);

		// Bibliothek meldet eine andere Credential-ID als die Antwort
		o = await d.dienst.optionenEinrichten(kontoId, ORT);
		const abweichend: Antwort = { id, ok: true, challenge: challengeAus(o), kennung: 'andere' };
		expect(await d.dienst.einrichten(kontoId, abweichend, ORT, 'iPhone', sitzungKennung)).toBe(
			'falsch'
		);

		// Antwort ohne gültige id
		o = await d.dienst.optionenEinrichten(kontoId, ORT);
		const ohneId = { id: 'a'.repeat(1024), ok: true, challenge: challengeAus(o) };
		expect(await d.dienst.einrichten(kontoId, ohneId, ORT, 'iPhone', sitzungKennung)).toBe(
			'falsch'
		);
		expect(await d.dienst.einrichten(kontoId, 42, ORT, 'iPhone', sitzungKennung)).toBe('falsch');

		// Challenge eines anderen Kontos gilt nicht
		const fremd = await legeMitgliedAn(db);
		o = await d.dienst.optionenEinrichten(fremd.kontoId, ORT);
		const mitFremderChallenge: Antwort = { id, ok: true, challenge: challengeAus(o) };
		expect(
			await d.dienst.einrichten(kontoId, mitFremderChallenge, ORT, 'iPhone', sitzungKennung)
		).toBe('falsch');

		expect(await passkeysVon(kontoId)).toHaveLength(0);
		expect((await pruefeSitzung(db, sitzungKennung, start))?.konto.passkeyHinweis).toBe(true);
	});

	test('SI-18: dasselbe Gerät zweimal einrichten ergibt falsch, der Eintrag bleibt', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const { kennung } = await richteEin(d, kontoId, { geraet: 'iPhone' });
		const vorher = await passkeysVon(kontoId);

		d.zeit.t = new Date(start.getTime() + MINUTE);
		const zweites = await richteEin(d, kontoId, { kennung, geraet: 'Mac' });

		expect(zweites.ergebnis).toBe('falsch');
		expect(await passkeysVon(kontoId)).toEqual(vorher);

		// Auch nicht unter einem anderen Konto
		const anderes = await legeMitgliedAn(db);
		expect((await richteEin(d, anderes.kontoId, { kennung })).ergebnis).toBe('falsch');
		expect(await passkeysVon(kontoId)).toEqual(vorher);
	});

	test('A-LOGIN-07: Optionen zum Einrichten für ein unbekanntes Konto werfen', async () => {
		const d = baue();
		await expect(d.dienst.optionenEinrichten(-1, ORT)).rejects.toThrow();
	});
});

describe('Mit Passkey anmelden', () => {
	test('A-LOGIN-07: mit Passkey anmelden ergibt eine Sitzung ohne Hinweis', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const { kennung } = await richteEin(d, kontoId);
		const spaeter = new Date(start.getTime() + 10 * MINUTE);
		d.zeit.t = spaeter;

		const r = await meldeAn(d, kennung);

		expect(r.ergebnis).toBe('ok');
		if (r.ergebnis !== 'ok') return;
		const angemeldet = await pruefeSitzung(db, r.kennung, spaeter);
		expect(angemeldet?.konto.kontoId).toBe(kontoId);
		expect(angemeldet?.konto.passkeyHinweis).toBe(false);
		const [p] = await passkeysVon(kontoId);
		expect(p.zuletztBenutzt).toEqual(spaeter);
		expect(p.zaehler).toBe(1);
	});

	test('A-LOGIN-07: Anmelden ersetzt die alte Sitzung dieses Geräts', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const alteKennung = await codeSitzung(kontoId);
		const { kennung } = await richteEin(d, kontoId, { sitzungKennung: alteKennung });
		const o = await d.dienst.optionenAnmelden(ORT, 'ip-1');
		if (o === 'zu-viele') throw new Error('unerwartet');
		const antwort: Antwort = { id: kennung, ok: true, challenge: challengeAus(o.optionen) };

		const r = await d.dienst.anmelden(o.vorgang, antwort, ORT, 'ip-1', alteKennung);

		expect(r.ergebnis).toBe('ok');
		expect(await pruefeSitzung(db, alteKennung, start)).toBeNull();
		expect(await sitzungenVon(kontoId)).toHaveLength(1);
	});

	test('SI-18: gesperrtes oder ausgetretenes Konto kommt mit Passkey nicht hinein', async () => {
		const d = baue();
		const gesperrt = await legeMitgliedAn(db);
		const ausgetreten = await legeMitgliedAn(db);
		const a = await richteEin(d, gesperrt.kontoId);
		const b = await richteEin(d, ausgetreten.kontoId);
		await db.update(konto).set({ gesperrt: true }).where(eq(konto.id, gesperrt.kontoId));
		await db
			.update(mitglied)
			.set({ status: 'ausgetreten' })
			.where(eq(mitglied.id, ausgetreten.mitgliedId));
		const vorher = d.aufrufe.pruefeAnmelden;

		expect(await meldeAn(d, a.kennung)).toEqual({ ergebnis: 'falsch' });
		expect(await meldeAn(d, b.kennung)).toEqual({ ergebnis: 'falsch' });

		expect(d.aufrufe.pruefeAnmelden).toBe(vorher);
		expect(await sitzungenVon(gesperrt.kontoId)).toHaveLength(1); // nur die Code-Sitzung
		expect(await sitzungenVon(ausgetreten.kontoId)).toHaveLength(1);
	});

	test('SI-18: Passkey einer anderen rpId wird nicht angenommen', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const { kennung } = await richteEin(d, kontoId, { ort: ANDERER_ORT });

		expect(await meldeAn(d, kennung, 'ip-1', ORT)).toEqual({ ergebnis: 'falsch' });
		expect((await meldeAn(d, kennung, 'ip-1', ANDERER_ORT)).ergebnis).toBe('ok');
	});

	test('SI-18: dieselbe Antwort zweimal ergibt beim zweiten Mal falsch', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const { kennung } = await richteEin(d, kontoId);
		const o = await d.dienst.optionenAnmelden(ORT, 'ip-1');
		if (o === 'zu-viele') throw new Error('unerwartet');
		const antwort: Antwort = { id: kennung, ok: true, challenge: challengeAus(o.optionen) };
		const sitzungenVorher = (await sitzungenVon(kontoId)).length;

		expect((await d.dienst.anmelden(o.vorgang, antwort, ORT, 'ip-1')).ergebnis).toBe('ok');
		expect(await d.dienst.anmelden(o.vorgang, antwort, ORT, 'ip-1')).toEqual({
			ergebnis: 'falsch'
		});
		expect(await sitzungenVon(kontoId)).toHaveLength(sitzungenVorher + 1);

		// Auch gleichzeitig gesendet gewinnt nur eine.
		const o2 = await d.dienst.optionenAnmelden(ORT, 'ip-1');
		if (o2 === 'zu-viele') throw new Error('unerwartet');
		const antwort2: Antwort = { id: kennung, ok: true, challenge: challengeAus(o2.optionen) };
		const beide = await Promise.all([
			d.dienst.anmelden(o2.vorgang, antwort2, ORT, 'ip-1'),
			d.dienst.anmelden(o2.vorgang, antwort2, ORT, 'ip-1')
		]);
		expect(beide.map((r) => r.ergebnis).sort()).toEqual(['falsch', 'ok']);
		expect(await sitzungenVon(kontoId)).toHaveLength(sitzungenVorher + 2);
	});

	test('SI-18: unbekannter, leerer oder abgelaufener Vorgang und kaputte Antwort ergeben falsch', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const { kennung } = await richteEin(d, kontoId);
		const o = await d.dienst.optionenAnmelden(ORT, 'ip-1');
		if (o === 'zu-viele') throw new Error('unerwartet');
		const antwort: Antwort = { id: kennung, ok: true, challenge: challengeAus(o.optionen) };

		expect(await d.dienst.anmelden('erfunden', antwort, ORT, 'ip-1')).toEqual({
			ergebnis: 'falsch'
		});
		expect(await d.dienst.anmelden('', antwort, ORT, 'ip-1')).toEqual({ ergebnis: 'falsch' });
		expect(await d.dienst.anmelden(42, antwort, ORT, 'ip-1')).toEqual({ ergebnis: 'falsch' });
		expect(await d.dienst.anmelden(o.vorgang, 'kaputt', ORT, 'ip-1')).toEqual({
			ergebnis: 'falsch'
		});
		// Der Vorgang ist durch den kaputten Versuch verbraucht.
		expect(await d.dienst.anmelden(o.vorgang, antwort, ORT, 'ip-1')).toEqual({
			ergebnis: 'falsch'
		});

		// Unbekannter Passkey
		const o2 = await d.dienst.optionenAnmelden(ORT, 'ip-1');
		if (o2 === 'zu-viele') throw new Error('unerwartet');
		const unbekannt: Antwort = {
			id: neueKennung(),
			ok: true,
			challenge: challengeAus(o2.optionen)
		};
		expect(await d.dienst.anmelden(o2.vorgang, unbekannt, ORT, 'ip-1')).toEqual({
			ergebnis: 'falsch'
		});

		// Prüfung scheitert
		const o3 = await d.dienst.optionenAnmelden(ORT, 'ip-1');
		if (o3 === 'zu-viele') throw new Error('unerwartet');
		const ungueltig: Antwort = { id: kennung, ok: false, challenge: challengeAus(o3.optionen) };
		expect(await d.dienst.anmelden(o3.vorgang, ungueltig, ORT, 'ip-1')).toEqual({
			ergebnis: 'falsch'
		});

		// Abgelaufen nach 5 Minuten
		const o4 = await d.dienst.optionenAnmelden(ORT, 'ip-1');
		if (o4 === 'zu-viele') throw new Error('unerwartet');
		const spaet: Antwort = { id: kennung, ok: true, challenge: challengeAus(o4.optionen) };
		d.zeit.t = new Date(start.getTime() + 5 * MINUTE + 1);
		expect(await d.dienst.anmelden(o4.vorgang, spaet, ORT, 'ip-1')).toEqual({
			ergebnis: 'falsch'
		});

		expect(await sitzungenVon(kontoId)).toHaveLength(1); // nur die Code-Sitzung
	});

	test('SI-18: nach 10 Fehlversuchen pro IP und Stunde zu-viele, auch bei Optionen', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const { kennung } = await richteEin(d, kontoId);
		const fehlversuch = async () => {
			const o = await d.dienst.optionenAnmelden(ORT, '203.0.113.7');
			if (o === 'zu-viele') return o;
			return (await d.dienst.anmelden(o.vorgang, { id: neueKennung() }, ORT, '203.0.113.7'))
				.ergebnis;
		};
		for (let i = 0; i < 10; i++) expect(await fehlversuch()).toBe('falsch');

		expect(await fehlversuch()).toBe('zu-viele');
		expect(await d.dienst.optionenAnmelden(ORT, '203.0.113.7')).toBe('zu-viele');
		expect(await d.dienst.anmelden('egal', {}, ORT, '203.0.113.7')).toEqual({
			ergebnis: 'zu-viele'
		});
		// Auch mit dem richtigen Passkey nicht, solange gebremst
		expect(await meldeAn(d, kennung, '203.0.113.7')).toEqual({ ergebnis: 'zu-viele' });
		// Andere IP ist frei
		expect((await meldeAn(d, kennung, '198.51.100.1')).ergebnis).toBe('ok');

		d.zeit.t = new Date(start.getTime() + 60 * MINUTE + 1);
		expect((await meldeAn(d, kennung, '203.0.113.7')).ergebnis).toBe('ok');
	});

	test('SI-18: gleichzeitige Versuche umgehen die Bremse nicht', async () => {
		const d = baue();
		const vorgaenge: string[] = [];
		for (let i = 0; i < 11; i++) {
			const o = await d.dienst.optionenAnmelden(ORT, 'ip-parallel');
			if (o === 'zu-viele') throw new Error('unerwartet');
			vorgaenge.push(o.vorgang);
		}
		const ergebnisse = await Promise.all(
			vorgaenge.map((v) => d.dienst.anmelden(v, { id: neueKennung() }, ORT, 'ip-parallel'))
		);
		expect(ergebnisse.filter((r) => r.ergebnis === 'zu-viele')).toHaveLength(1);
		expect(ergebnisse.filter((r) => r.ergebnis === 'falsch')).toHaveLength(10);
	});
});

describe('Passkeys verwalten', () => {
	test('A-LOGIN-07: eigenen Passkey entfernen', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const { kennung } = await richteEin(d, kontoId);

		expect(await d.dienst.entferne(kontoId, kennung)).toBe('ok');

		expect(await d.dienst.liste(kontoId, ORT)).toEqual([]);
		expect(await meldeAn(d, kennung)).toEqual({ ergebnis: 'falsch' });
		expect(await d.dienst.entferne(kontoId, kennung)).toBe('nicht-gefunden');
	});

	test('SI-18: Passkey eines anderen Kontos entfernen ergibt nicht-gefunden', async () => {
		const d = baue();
		const ich = await legeMitgliedAn(db);
		const fremd = await legeMitgliedAn(db);
		const fremder = await richteEin(d, fremd.kontoId);

		expect(await d.dienst.entferne(ich.kontoId, fremder.kennung)).toBe('nicht-gefunden');
		expect(await d.dienst.entferne(ich.kontoId, 42)).toBe('nicht-gefunden');
		expect(await d.dienst.entferne(ich.kontoId, undefined)).toBe('nicht-gefunden');

		expect(await passkeysVon(fremd.kontoId)).toHaveLength(1);
		expect((await meldeAn(d, fremder.kennung)).ergebnis).toBe('ok');
	});

	test('A-LOGIN-07: Liste zeigt Gerät, eingerichtet und zuletzt benutzt, neueste zuerst', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const fremd = await legeMitgliedAn(db);
		await richteEin(d, fremd.kontoId);
		const aelter = await richteEin(d, kontoId, { geraet: 'iPhone' });
		const zweiteZeit = new Date(start.getTime() + 5 * MINUTE);
		d.zeit.t = zweiteZeit;
		const neuer = await richteEin(d, kontoId, { geraet: 'Mac' });
		const benutzt = new Date(start.getTime() + 7 * MINUTE);
		d.zeit.t = benutzt;
		expect((await meldeAn(d, aelter.kennung)).ergebnis).toBe('ok');

		expect(await d.dienst.liste(kontoId, ORT)).toEqual([
			{ kennung: neuer.kennung, geraet: 'Mac', eingerichtetAm: zweiteZeit, zuletztBenutzt: null },
			{ kennung: aelter.kennung, geraet: 'iPhone', eingerichtetAm: start, zuletztBenutzt: benutzt }
		]);
	});

	test('SI-18: Liste zeigt keinen Passkey einer anderen rpId', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const hier = await richteEin(d, kontoId, { geraet: 'iPhone' });
		await richteEin(d, kontoId, { ort: ANDERER_ORT, geraet: 'Mac' });

		const liste = await d.dienst.liste(kontoId, ORT);
		expect(liste.map((p) => p.kennung)).toEqual([hier.kennung]);
	});

	test('A-LOGIN-07: «Nein, danke» beendet den Hinweis der Sitzung', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const sitzungKennung = await codeSitzung(kontoId);

		await d.dienst.hinweisErledigt(sitzungKennung);

		expect((await pruefeSitzung(db, sitzungKennung, start))?.konto.passkeyHinweis).toBe(false);
	});

	test('A-LOGIN-07: Konto löschen löscht seine Passkeys', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		await richteEin(d, kontoId);
		await richteEin(d, kontoId);
		expect(await passkeysVon(kontoId)).toHaveLength(2);

		await db.delete(konto).where(eq(konto.id, kontoId));

		expect(await passkeysVon(kontoId)).toHaveLength(0);
	});

	test('SI-07: Alle Sitzungen beenden lässt die Passkeys bestehen', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const { kennung } = await richteEin(d, kontoId);

		await beendeAlleSitzungen(db, kontoId);

		expect(await sitzungenVon(kontoId)).toHaveLength(0);
		expect(await passkeysVon(kontoId)).toHaveLength(1);
		const r = await meldeAn(d, kennung);
		expect(r.ergebnis).toBe('ok');
		if (r.ergebnis === 'ok') expect(await pruefeSitzung(db, r.kennung, start)).not.toBeNull();
	});

	test('A-LOGIN-08: Login per Code funktioniert unverändert mit eingerichtetem Passkey', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		await richteEin(d, kontoId);
		const login = erstelleLoginDienst({
			db,
			schluessel: 'x'.repeat(40),
			kontakt: 'kontakt@example.org',
			mailer: async () => {},
			bremsen: erstelleBremsen(),
			jetzt: () => start
		});
		const { code } = await login.stelleBriefCodeAus(kontoId);

		const r = await login.loginMitBriefCode(code, 'ip-code');

		expect(r.ergebnis).toBe('ok');
		if (r.ergebnis === 'ok') {
			const angemeldet = await login.pruefeSitzung(r.kennung);
			expect(angemeldet?.konto.kontoId).toBe(kontoId);
			expect(angemeldet?.konto.passkeyHinweis).toBe(true);
		}
		expect(await passkeysVon(kontoId)).toHaveLength(1);
	});
});
