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

describe('Admin-Schnittstelle Rollen, eigene Datenbank', () => {
	test('RR-03: der letzte Admin kann sich die Rolle nicht entziehen → 409 letzter-admin', async () => {
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
		const admin = await legeMitgliedAn(db, { rollen: ['admin'] });
		const kennung = await erstelleSitzung(db, admin.kontoId, start);
		const konto = (await pruefeSitzung(db, kennung, start))!.konto;
		await (
			await zugang.fordereCodeAn(konto)
		).arbeit;
		expect(await zugang.bestaetige(konto, post[0].text.slice(0, 6))).toBe('ok');

		const r = await postRollen(
			d,
			ereignis({
				body: { rollen: [] },
				params: { id: String(admin.mitgliedId) },
				konto
			})
		);
		expect(r.status).toBe(409);
		expect(await r.json()).toEqual({ fehler: 'letzter-admin' });
	});
});
