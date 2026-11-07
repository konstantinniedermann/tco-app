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
	passkey,
	pushAbo,
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
		.set({ telefon: '079 000 00 00', jahrgang: 1990, lizenznummer: 'L-123' })
		.where(eq(mitglied.id, m.mitgliedId));
	await db
		.update(konto)
		.set({
			briefCodeHash: `GEHEIM-BRIEFCODE-${randomUUID()}`,
			briefCodeAblauf: new Date('2030-01-01T00:00:00Z')
		})
		.where(eq(konto.id, m.kontoId));
	const kennung = await erstelleSitzung(db, m.kontoId, jetzt);
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
		eingerichtetAm: new Date('2026-05-01T10:00:00Z')
	});
	const [a] = await db
		.insert(anlass)
		.values({
			titel: 'Saisonstart Erfunden',
			beginn: new Date('2027-03-19T18:30:00Z'),
			ort: 'Clubhaus',
			anmeldeschluss: new Date('2027-03-16T22:59:00Z'),
			kalenderKennung: randomUUID()
		})
		.returning({ id: anlass.id });
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
		.values({ kategorieId: k.id, status: 'bestaetigt', angemeldetAm: jetzt, geaendertAm: jetzt })
		.returning({ id: anmeldung.id });
	await db.insert(anmeldungSpieler).values({ anmeldungId: an.id, mitgliedId: m.mitgliedId });
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
	test('enthält Angaben, Rollen, Login, Anlass, CM-Anmeldung und den ganzen Verlauf', async () => {
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
		expect(a!.login).toEqual({
			geraete: 1,
			zuletztGenutzt: jetzt,
			passkeys: [{ eingerichtetAm: new Date('2026-05-01T10:00:00Z') }],
			pushGeraete: 1
		});
		expect(a!.anlaesse).toEqual([
			{
				titel: 'Saisonstart Erfunden',
				beginn: new Date('2027-03-19T18:30:00Z'),
				antwort: 'kommt-nicht',
				bemerkung: 'Ferien'
			}
		]);
		expect(a!.cm).toEqual([{ turnier: 'CM 2088', kategorie: 'Herren A', status: 'bestaetigt' }]);
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
		const d: AdminDienste = { db, zugang, hinweis: async () => {}, jetzt: () => jetzt };
		const leser = await legeMitgliedAn(db, { rollen: ['mytco'] });
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

		// Gelöscht und unbekannt: 404, kein weiterer Eintrag.
		const weg = await legeMitgliedAn(db, { status: 'geloescht' });
		await db.delete(konto).where(eq(konto.id, weg.kontoId));
		for (const id of [String(weg.mitgliedId), 'abc', '999999999']) {
			const n = await getAuskunft(d, ereignis({ method: 'GET', params: { id }, konto: k }));
			expect([id, n.status, await n.json()]).toEqual([id, 404, { fehler: 'nicht-gefunden' }]);
		}
		expect(
			await db.select().from(aenderung).where(eq(aenderung.aktion, 'auskunft-erstellt'))
		).toHaveLength(1);
	});
});
