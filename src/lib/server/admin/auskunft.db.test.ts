import { createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import type { Db } from '../db/index.ts';
import {
	aenderung,
	anlass,
	anlassAnmeldung,
	anmeldung,
	anmeldungSpieler,
	kategorie,
	konto,
	mitglied,
	mitteilung,
	passkey,
	pushAbo,
	sitzung,
	turnier
} from '../db/schema.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { erstelleSitzung, pruefeSitzung } from '../login/sitzung.ts';
import { ladeAuskunft } from './auskunft.ts';
import { getAuskunft, type AdminDienste } from './schnittstellen.ts';
import { erstelleZugangDienst } from './zugang.ts';

let eigene: EigeneDatenbank | undefined;
let db: Db;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('auskunft');
	db = eigene.db;
});

afterAll(async () => {
	await eigene?.abbauen();
});

const jetzt = new Date('2026-11-07T08:00:00Z');
const hash = (kennung: string) => createHash('sha256').update(kennung).digest('hex');

// Mitglied mit allem, was MyTCO speichert; Geheimnisse tragen erkennbare Werte.
let jahr = 2088;
async function vollesMitglied() {
	const m = await legeMitgliedAn(db, { vorname: 'Erika', nachname: 'Beispiel', rollen: ['cm'] });
	await db
		.update(mitglied)
		.set({
			telefon: '079 000 00 00',
			jahrgang: 1990,
			lizenznummer: 'L-123',
			klassierung: 'R4',
			fairgateOffenSeit: new Date('2026-10-01T08:00:00Z')
		})
		.where(eq(mitglied.id, m.mitgliedId));
	await db
		.update(konto)
		.set({
			briefCodeHash: `GEHEIM-BRIEFCODE-${randomUUID()}`,
			briefCodeAblauf: new Date('2030-01-01T00:00:00Z'),
			themaCm: false
		})
		.where(eq(konto.id, m.kontoId));
	const kennung = await erstelleSitzung(db, m.kontoId, jetzt);
	await db
		.update(sitzung)
		.set({ adminBestaetigtAm: jetzt, ansichtRolle: 'cm' })
		.where(eq(sitzung.kennungHash, hash(kennung)));
	await db.insert(pushAbo).values({
		endpunkt: `https://push.example.org/GEHEIM-ENDPUNKT-${randomUUID()}`,
		sitzungHash: hash(kennung),
		kontoId: m.kontoId,
		p256dh: 'GEHEIM-P256',
		auth: 'GEHEIM-AUTH',
		eingerichtetAm: jetzt
	});
	await db.insert(passkey).values({
		kennung: `GEHEIM-PASSKEY-KENNUNG-${randomUUID()}`,
		kontoId: m.kontoId,
		oeffentlicherSchluessel: 'GEHEIM-SCHLUESSEL',
		rpId: 'mytco.example.org',
		geraet: 'iPhone',
		eingerichtetAm: new Date('2026-05-01T10:00:00Z'),
		zuletztBenutzt: new Date('2026-10-02T09:00:00Z')
	});
	const [a] = await db
		.insert(anlass)
		.values({
			titel: 'Saisonstart Erfunden',
			beginn: new Date('2027-03-19T18:30:00Z'),
			ort: 'Clubhaus',
			anmeldeschluss: new Date('2027-03-16T22:59:00Z'),
			kalenderKennung: randomUUID(),
			erstelltVon: m.mitgliedId
		})
		.returning({ id: anlass.id });
	await db.insert(mitteilung).values({
		bezug: 'verein',
		absenderId: m.mitgliedId,
		gesendetAm: new Date('2026-09-01T10:00:00Z'),
		titel: 'Platzsperre Erfunden',
		text: 'GEHEIM-TEXT-NICHT-IN-AUSKUNFT',
		auswahl: 'alle',
		weg: 'push'
	});
	await db.insert(anlassAnmeldung).values({
		anlassId: a.id,
		mitgliedId: m.mitgliedId,
		antwort: 'kommt-nicht',
		bemerkung: 'Ferien',
		geaendertAm: jetzt
	});
	const [t] = await db
		.insert(turnier)
		.values({ jahr: jahr++, name: 'CM 2088', anmeldeschluss: '2088-05-31', status: 'offen' })
		.returning({ id: turnier.id });
	const [k] = await db
		.insert(kategorie)
		.values({
			turnierId: t.id,
			name: 'Herren A',
			geschlecht: 'herren',
			art: 'einzel',
			klassierungVon: 'R1',
			klassierungBis: 'R5'
		})
		.returning({ id: kategorie.id });
	const [an] = await db
		.insert(anmeldung)
		.values({
			kategorieId: k.id,
			status: 'bestaetigt',
			kommentar: 'Wildcard Erfunden',
			angemeldetAm: new Date('2026-10-05T07:00:00Z'),
			geaendertAm: jetzt
		})
		.returning({ id: anmeldung.id });
	await db.insert(anmeldungSpieler).values({ anmeldungId: an.id, mitgliedId: m.mitgliedId });
	// Offener Wildcard-Antrag: sieht der Mitglieder-Admin nicht (Rechte-Matrix, FR-08).
	const [k2] = await db
		.insert(kategorie)
		.values({
			turnierId: t.id,
			name: 'Herren Open',
			geschlecht: 'herren',
			art: 'einzel',
			klassierungVon: 'N1',
			klassierungBis: 'R3'
		})
		.returning({ id: kategorie.id });
	const [wc] = await db
		.insert(anmeldung)
		.values({
			kategorieId: k2.id,
			status: 'beantragt',
			kommentar: 'WILDCARD-KOMMENTAR-NICHT-IN-AUSKUNFT',
			angemeldetAm: new Date('2026-10-06T07:00:00Z'),
			geaendertAm: jetzt
		})
		.returning({ id: anmeldung.id });
	await db.insert(anmeldungSpieler).values({ anmeldungId: wc.id, mitgliedId: m.mitgliedId });
	// 60 Einträge: mehr als die 50 der Mitgliederseite.
	await db.insert(aenderung).values(
		Array.from({ length: 60 }, (_, i) => ({
			mitgliedId: m.mitgliedId,
			zeitpunkt: new Date(jetzt.getTime() - i * 60_000),
			urheberArt: 'automatisch',
			aktion: 'sitzungen-beendet'
		}))
	);
	return m;
}

describe('ladeAuskunft (DS-07)', () => {
	test('enthält Angaben, Rollen, Login, Anlass, bestätigte CM-Anmeldung ohne Wildcard und den ganzen Verlauf', async () => {
		const m = await vollesMitglied();
		const a = await ladeAuskunft(db, m.mitgliedId, jetzt);
		expect(a).not.toBeNull();
		expect(a!.erstelltAm).toEqual(jetzt);
		expect(a!.name).toBe('Beispiel, Erika');
		expect(a!.status).toBe('aktiv');
		expect(a!.angaben).toMatchObject({
			vorname: 'Erika',
			nachname: 'Beispiel',
			telefon: '079 000 00 00',
			jahrgang: 1990,
			lizenznummer: 'L-123'
		});
		expect(a!.rollen).toEqual(['cm']);
		expect(a!.klassierung).toBe('R4');
		expect(a!.fairgateOffenSeit).toEqual(new Date('2026-10-01T08:00:00Z'));
		expect(a!.themen).toEqual(['anlaesse', 'verein']);
		expect(a!.login).toEqual({
			geraete: [
				{ erstelltAm: jetzt, zuletztGenutzt: jetzt, verwaltungBestaetigtAm: jetzt, ansicht: 'cm' }
			],
			passkeys: [
				{
					geraet: 'iPhone',
					eingerichtetAm: new Date('2026-05-01T10:00:00Z'),
					zuletztBenutzt: new Date('2026-10-02T09:00:00Z')
				}
			],
			push: [{ eingerichtetAm: jetzt }]
		});
		expect(a!.anlaesseErstellt).toEqual([
			{ titel: 'Saisonstart Erfunden', beginn: new Date('2027-03-19T18:30:00Z') }
		]);
		expect(a!.mitteilungen).toEqual([
			{ titel: 'Platzsperre Erfunden', gesendetAm: new Date('2026-09-01T10:00:00Z') }
		]);
		expect(a!.anlaesse).toEqual([
			{
				titel: 'Saisonstart Erfunden',
				beginn: new Date('2027-03-19T18:30:00Z'),
				antwort: 'kommt-nicht',
				bemerkung: 'Ferien',
				geaendertAm: jetzt
			}
		]);
		expect(a!.cm).toEqual([
			{
				turnier: 'CM 2088',
				kategorie: 'Herren A',
				angemeldetAm: new Date('2026-10-05T07:00:00Z')
			}
		]);
		expect(JSON.stringify(a)).not.toContain('Wildcard Erfunden');
		expect(JSON.stringify(a)).not.toContain('WILDCARD-KOMMENTAR');
		expect(a!.verlauf).toHaveLength(60);
		expect(a!.mitgliedschaft).toEqual({ austrittAm: null, vorgemerktAm: null, loeschtAm: null });
	});

	test('kein Geheimnis im Ergebnis: verbotene Schlüssel und Werte fehlen, rekursiv geprüft', async () => {
		const m = await vollesMitglied();
		const a = await ladeAuskunft(db, m.mitgliedId, jetzt);
		const verboten = ['briefCodeHash', 'kennungHash', 'publicKey', 'endpoint', 'p256dh', 'auth'];
		const schluessel = (wert: unknown): string[] =>
			Array.isArray(wert)
				? wert.flatMap(schluessel)
				: wert !== null && typeof wert === 'object' && !(wert instanceof Date)
					? Object.entries(wert).flatMap(([k, v]) => [k, ...schluessel(v)])
					: [];
		const alle = schluessel(a);
		expect(alle).toContain('eingerichtetAm');
		for (const k of verboten) expect(alle).not.toContain(k);
		expect(JSON.stringify(a)).not.toContain('GEHEIM');
	});

	test('«Wer» im Verlauf: Mitgliederverwaltung, MyTCO, eigener Name, gelöschtes Konto; kein Admin-Name', async () => {
		const m = await legeMitgliedAn(db, { vorname: 'Erika', nachname: 'Beispiel' });
		const admin = await legeMitgliedAn(db, { vorname: 'Adam', nachname: 'Verwalterich' });
		const zeit = (min: number) => new Date(jetzt.getTime() - min * 60_000);
		await db.insert(aenderung).values([
			{
				mitgliedId: m.mitgliedId,
				zeitpunkt: zeit(1),
				urheberArt: 'admin',
				urheberMitgliedId: admin.mitgliedId,
				aktion: 'ausgetreten'
			},
			{
				mitgliedId: m.mitgliedId,
				zeitpunkt: zeit(2),
				urheberArt: 'automatisch',
				aktion: 'sitzungen-beendet'
			},
			{
				mitgliedId: m.mitgliedId,
				zeitpunkt: zeit(3),
				urheberArt: 'mitglied',
				urheberMitgliedId: m.mitgliedId,
				aktion: 'feld-geaendert',
				detail: 'telefon'
			},
			{
				mitgliedId: m.mitgliedId,
				zeitpunkt: zeit(4),
				urheberArt: 'admin',
				urheberMitgliedId: null,
				aktion: 'wiedereingetreten'
			}
		]);
		const a = await ladeAuskunft(db, m.mitgliedId, jetzt);
		expect(a!.verlauf.map((z) => [z.urheber, z.aktion])).toEqual([
			['Mitgliederverwaltung', 'ausgetreten'],
			['MyTCO', 'sitzungen-beendet'],
			['Beispiel, Erika', 'feld-geaendert'],
			['gelöschtes Konto', 'wiedereingetreten']
		]);
		expect(JSON.stringify(a)).not.toContain('Verwalterich');
		expect(JSON.stringify(a)).not.toContain('(selbst)');
	});

	test('gelöschtes oder unbekanntes Mitglied → null', async () => {
		const weg = await legeMitgliedAn(db);
		await db.delete(konto).where(eq(konto.id, weg.kontoId));
		expect(await ladeAuskunft(db, weg.mitgliedId, jetzt)).toBeNull();
		expect(await ladeAuskunft(db, 999_999_999, jetzt)).toBeNull();
	});
});

describe('getAuskunft', () => {
	test('200 mit der Auskunft; der Aufruf steht im Verlauf, der Lesende ist Urheber', async () => {
		const post: { text: string }[] = [];
		const zugang = erstelleZugangDienst({
			db,
			schluessel: 'x'.repeat(40),
			kontakt: 'kontakt@example.org',
			mailer: async (n) => {
				post.push(n);
			},
			bremsen: erstelleBremsen(),
			jetzt: () => jetzt
		});
		const d: AdminDienste = {
			db,
			zugang,
			hinweis: async () => {},
			brief: {
				schluessel: 'y'.repeat(40),
				adresse: 'https://mytco.example.org',
				kontakt: 'kontakt@example.org'
			},
			jetzt: () => jetzt
		};
		const leser = await legeMitgliedAn(db, {
			vorname: 'Lea',
			nachname: 'Leserich',
			rollen: ['mytco']
		});
		const kennung = await erstelleSitzung(db, leser.kontoId, jetzt);
		const k = (await pruefeSitzung(db, kennung, jetzt))!.konto;
		await (
			await zugang.fordereCodeAn(k)
		).arbeit;
		expect(await zugang.bestaetige(k, post[0].text.slice(0, 6))).toBe('ok');
		const ziel = await vollesMitglied();
		const params = { id: String(ziel.mitgliedId) };

		const r = await getAuskunft(d, ereignis({ method: 'GET', params, konto: k }));
		expect(r.status).toBe(200);
		const koerper = await r.json();
		expect(koerper.name).toBe('Beispiel, Erika');
		expect(JSON.stringify(koerper)).not.toContain('GEHEIM');
		const eintraege = await db
			.select()
			.from(aenderung)
			.where(eq(aenderung.aktion, 'auskunft-erstellt'));
		expect(eintraege).toHaveLength(1);
		expect(eintraege[0]).toMatchObject({
			mitgliedId: ziel.mitgliedId,
			urheberArt: 'admin',
			urheberMitgliedId: leser.mitgliedId,
			detail: null
		});

		// Zweiter Abruf: der erste steht im Verlauf, ohne Namen des Admins.
		const zweite = await (
			await getAuskunft(d, ereignis({ method: 'GET', params, konto: k }))
		).json();
		expect(zweite.verlauf[0]).toMatchObject({
			urheber: 'Mitgliederverwaltung',
			aktion: 'auskunft-erstellt'
		});
		expect(JSON.stringify(zweite)).not.toContain('Leserich');

		// Gelöscht und unbekannt: 404, kein weiterer Eintrag.
		const weg = await legeMitgliedAn(db, { status: 'geloescht' });
		await db.delete(konto).where(eq(konto.id, weg.kontoId));
		for (const id of [String(weg.mitgliedId), 'abc', '999999999']) {
			const n = await getAuskunft(d, ereignis({ method: 'GET', params: { id }, konto: k }));
			expect([id, n.status, await n.json()]).toEqual([id, 404, { fehler: 'nicht-gefunden' }]);
		}
		expect(
			await db.select().from(aenderung).where(eq(aenderung.aktion, 'auskunft-erstellt'))
		).toHaveLength(2);
	});
});
