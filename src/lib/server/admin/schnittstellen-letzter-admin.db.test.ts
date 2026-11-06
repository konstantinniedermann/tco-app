import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { erstelleSitzung, pruefeSitzung } from '../login/sitzung.ts';
import { postRollen, type AdminDienste } from './schnittstellen.ts';
import { erstelleZugangDienst } from './zugang.ts';

// «Letzter Admin» ist global; darum eine eigene Datenbank statt der gemeinsamen.
let eigene: EigeneDatenbank | undefined;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('letzter_admin');
});

afterAll(async () => {
	await eigene?.abbauen();
});

const start = new Date('2026-11-02T12:00:00Z');

async function bestaetigterMytcoAdmin() {
	const db = eigene!.db;
	const post: { text: string }[] = [];
	const zugang = erstelleZugangDienst({
		db,
		schluessel: 'x'.repeat(40),
		kontakt: 'kontakt@example.org',
		mailer: async (n) => {
			post.push(n);
		},
		bremsen: erstelleBremsen(),
		jetzt: () => start
	});
	const d: AdminDienste = { db, zugang, hinweis: async () => {}, jetzt: () => start };
	const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
	const kennung = await erstelleSitzung(db, admin.kontoId, start);
	const konto = (await pruefeSitzung(db, kennung, start))!.konto;
	await (
		await zugang.fordereCodeAn(konto)
	).arbeit;
	expect(await zugang.bestaetige(konto, post[0].text.slice(0, 6))).toBe('ok');
	return { d, admin, konto };
}

describe('Admin-Schnittstelle Rollen, eigene Datenbank', () => {
	test('RR-03: der letzte MyTCO-Admin kann sich mytco nicht entziehen → 409 letzter-mytco', async () => {
		const { d, admin, konto } = await bestaetigterMytcoAdmin();
		const r = await postRollen(
			d,
			ereignis({
				body: { rollen: ['mitglieder'], vorher: ['mytco', 'mitglieder'] },
				params: { id: String(admin.mitgliedId) },
				konto
			})
		);
		expect(r.status).toBe(409);
		expect(await r.json()).toEqual({ fehler: 'letzter-mytco' });
	});

	test('postRollen ohne vorher → 400 eingabe', async () => {
		const { d, admin, konto } = await bestaetigterMytcoAdmin();
		for (const vorher of [undefined, 'mytco', ['root'], ['cm', 'cm']]) {
			const r = await postRollen(
				d,
				ereignis({
					body: { rollen: ['mytco'], vorher },
					params: { id: String(admin.mitgliedId) },
					konto
				})
			);
			expect(r.status, JSON.stringify(vorher)).toBe(400);
			expect(await r.json()).toEqual({ fehler: 'eingabe' });
		}
	});

	test('postRollen: veralteter Stand → 409 veraltet', async () => {
		const { d, admin, konto } = await bestaetigterMytcoAdmin();
		const r = await postRollen(
			d,
			ereignis({
				body: { rollen: ['mytco', 'mitglieder', 'cm'], vorher: ['mytco'] },
				params: { id: String(admin.mitgliedId) },
				konto
			})
		);
		expect(r.status).toBe(409);
		expect(await r.json()).toEqual({ fehler: 'veraltet' });
	});

	test('postRollen: nur Mitglieder-Admin darf keine Rollen vergeben → 403 kein-admin', async () => {
		const { d, konto } = await bestaetigterMytcoAdmin();
		const db = eigene!.db;
		const ziel = await legeMitgliedAn(db);
		// Der angemeldete MyTCO-Admin gibt mytco ab und hat danach nur noch mitglieder.
		await legeMitgliedAn(db, { rollen: ['mytco'] });
		const abgeben = await postRollen(
			d,
			ereignis({
				body: { rollen: ['mitglieder'], vorher: ['mytco', 'mitglieder'] },
				params: { id: String(konto.mitgliedId) },
				konto
			})
		);
		expect(abgeben.status).toBe(200);
		const r = await postRollen(
			d,
			ereignis({
				body: { rollen: ['cm'], vorher: [] },
				params: { id: String(ziel.mitgliedId) },
				konto
			})
		);
		expect(r.status).toBe(403);
		expect(await r.json()).toEqual({ fehler: 'kein-admin' });
	});
});
