import { eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { mitglied } from '../db/schema.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { erstelleSitzung, pruefeSitzung } from '../login/sitzung.ts';
import { erstelleEmailWechselDienst } from './email-wechsel.ts';
import {
	getProfil,
	postEmail,
	postEmailBestaetigen,
	postProfil,
	type ProfilDienste
} from './schnittstellen.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
afterAll(async () => {
	await db.$client.end();
});

const logs = [
	vi.spyOn(console, 'error').mockImplementation(() => {}),
	vi.spyOn(console, 'warn').mockImplementation(() => {}),
	vi.spyOn(console, 'log').mockImplementation(() => {})
];
// SI-05: Jeder Test dieser Datei beweist, dass die Schnittstellen nichts loggen.
afterEach(() => {
	try {
		for (const l of logs) expect(l).not.toHaveBeenCalled();
	} finally {
		for (const l of logs) l.mockClear();
	}
});

const start = new Date('2026-11-05T12:00:00Z');

function baue() {
	const post: { an: string; betreff: string; text: string }[] = [];
	const wechsel = erstelleEmailWechselDienst({
		db,
		schluessel: 'x'.repeat(40),
		kontakt: 'kontakt@example.org',
		mailer: async (n) => {
			post.push(n);
		},
		bremsen: erstelleBremsen(() => start.getTime()),
		jetzt: () => start
	});
	const d: ProfilDienste = { db, wechsel, jetzt: () => start };
	return { d, post };
}

async function lea() {
	const m = await legeMitgliedAn(db, { vorname: 'Lea', nachname: 'Beispiel' });
	const kennung = await erstelleSitzung(db, m.kontoId, start);
	const konto = (await pruefeSitzung(db, kennung, start))!.konto;
	return { ...m, konto };
}

const schnittstellen = [
	['getProfil', getProfil, 'GET'],
	['postProfil', postProfil, 'POST'],
	['postEmail', postEmail, 'POST'],
	['postEmailBestaetigen', postEmailBestaetigen, 'POST']
] as const;

describe('Profil-Schnittstellen', () => {
	test('A-KONTO-01: jede Schnittstelle antwortet ohne Sitzung 401', async () => {
		const { d } = baue();
		for (const [name, fn, method] of schnittstellen) {
			const r = await fn(d, ereignis({ method, body: {} }));
			expect([name, r.status, await r.json()]).toEqual([name, 401, { fehler: 'abgemeldet' }]);
			expect(r.headers.get('cache-control')).toBe('no-store');
		}
	});

	test('SI-10: ändernde Schnittstellen lehnen text/plain mit 415 ab', async () => {
		const { d } = baue();
		const l = await lea();
		for (const [name, fn, method] of schnittstellen.filter(([, , m]) => m === 'POST')) {
			const r = await fn(
				d,
				ereignis({ method, body: '{}', contentType: 'text/plain', konto: l.konto })
			);
			expect([name, r.status, await r.json()]).toEqual([name, 415, { fehler: 'format' }]);
		}
	});

	test('A-KONTO-01: getProfil liefert die eigenen Angaben', async () => {
		const { d } = baue();
		const l = await lea();
		const r = await getProfil(d, ereignis({ method: 'GET', konto: l.konto }));
		expect(r.status).toBe(200);
		const { angaben } = await r.json();
		expect(angaben.vorname).toBe('Lea');
		expect(angaben.email).toBe(l.email);
	});

	test('A-KONTO-01: postProfil speichert; dasselbe vorher zum zweiten Mal gibt 409', async () => {
		const { d } = baue();
		const l = await lea();
		const { angaben: vorher } = await (
			await getProfil(d, ereignis({ method: 'GET', konto: l.konto }))
		).json();
		const sende = () =>
			postProfil(
				d,
				ereignis({ body: { angaben: { telefon: '079 123 45 67' }, vorher }, konto: l.konto })
			);
		const erste = await sende();
		expect([erste.status, await erste.json()]).toEqual([200, { geaendert: ['telefon'] }]);
		const zweite = await sende();
		expect([zweite.status, await zweite.json()]).toEqual([409, { fehler: 'veraltet' }]);
	});

	test('A-KONTO-01: postProfil meldet ungültige eigene Felder mit 400 und nur deren Namen', async () => {
		const { d } = baue();
		const l = await lea();
		const { angaben: vorher } = await (
			await getProfil(d, ereignis({ method: 'GET', konto: l.konto }))
		).json();
		const r = await postProfil(
			d,
			ereignis({ body: { angaben: { plz: 'abc' }, vorher }, konto: l.konto })
		);
		expect(r.status).toBe(400);
		const inhalt = await r.json();
		expect(inhalt.fehler).toBe('eingabe');
		expect(Object.keys(inhalt.felder)).toEqual(['plz']);
		expect(inhalt.fremd).toBeUndefined();
	});

	test('A-KONTO-01: postProfil ohne gültiges vorher oder angaben gibt 400', async () => {
		const { d } = baue();
		const l = await lea();
		for (const body of [{}, { angaben: { telefon: '1' } }, { angaben: 'x', vorher: {} }]) {
			const r = await postProfil(d, ereignis({ body, konto: l.konto }));
			expect([r.status, (await r.json()).fehler]).toEqual([400, 'eingabe']);
		}
	});

	test('A-KONTO-01: scheitert die Prüfung nur an Altdaten fremder Felder, meldet postProfil fremd', async () => {
		const { d } = baue();
		const l = await lea();
		// Altdaten: leerer Vorname, den das Mitglied selbst nicht ändern darf.
		await db.update(mitglied).set({ vorname: ' ' }).where(eq(mitglied.id, l.mitgliedId));
		const { angaben: vorher } = await (
			await getProfil(d, ereignis({ method: 'GET', konto: l.konto }))
		).json();
		const r = await postProfil(
			d,
			ereignis({ body: { angaben: { telefon: '079 123 45 67' }, vorher }, konto: l.konto })
		);
		expect([r.status, await r.json()]).toEqual([
			400,
			{ fehler: 'eingabe', felder: {}, fremd: true }
		]);
	});

	test('A-KONTO-01: postEmail antwortet 202 sofort, ohne auf den Mailversand zu warten', async () => {
		const s = baue();
		const l = await lea();
		const neu = `lea.neu-${crypto.randomUUID()}@example.org`;
		const r = await postEmail(s.d, ereignis({ body: { email: neu }, konto: l.konto }));
		expect([r.status, await r.json()]).toEqual([202, {}]);
		// Die Mails laufen im Hintergrund; warten, damit nichts nach dem Test weiterläuft.
		await vi.waitFor(() => expect(s.post).toHaveLength(2));
	});

	test('A-KONTO-01: postEmail meldet gleiche und ungültige Adresse mit 400', async () => {
		const { d } = baue();
		const l = await lea();
		const gleich = await postEmail(
			d,
			ereignis({ body: { email: l.email.toUpperCase() }, konto: l.konto })
		);
		expect([gleich.status, await gleich.json()]).toEqual([400, { fehler: 'gleich' }]);
		const kaputt = await postEmail(d, ereignis({ body: { email: 'kein-mail' }, konto: l.konto }));
		expect([kaputt.status, await kaputt.json()]).toEqual([400, { fehler: 'eingabe' }]);
	});

	test('A-KONTO-01: postEmail bremst nach 3 Anfragen pro Stunde mit 429', async () => {
		const { d, post } = baue();
		const l = await lea();
		const stati: number[] = [];
		for (let i = 0; i < 4; i++) {
			const email = `lea.neu-${crypto.randomUUID()}@example.org`;
			stati.push((await postEmail(d, ereignis({ body: { email }, konto: l.konto }))).status);
		}
		expect(stati).toEqual([202, 202, 202, 429]);
		await vi.waitFor(() => expect(post).toHaveLength(6));
	});

	test('A-KONTO-01: Wechsel mit beiden Codes über die Schnittstellen ändert die Adresse', async () => {
		const s = baue();
		const l = await lea();
		const neu = `lea.neu-${crypto.randomUUID()}@example.org`;
		// Zugriff auf `arbeit` gibt es über HTTP nicht; der Test wartet auf den Versand der Mails.
		await postEmail(s.d, ereignis({ body: { email: neu }, konto: l.konto }));
		await vi.waitFor(() => expect(s.post).toHaveLength(2));
		const code = (an: string) => s.post.find((n) => n.an === an)!.text.slice(0, 6);

		const falsch = await postEmailBestaetigen(
			s.d,
			ereignis({ body: { codeAlt: '000000', codeNeu: '000000' }, konto: l.konto })
		);
		expect([falsch.status, await falsch.json()]).toEqual([400, { fehler: 'falsch' }]);

		const ok = await postEmailBestaetigen(
			s.d,
			ereignis({ body: { codeAlt: code(l.email), codeNeu: code(neu) }, konto: l.konto })
		);
		expect([ok.status, await ok.json()]).toEqual([200, {}]);
		const [zeile] = await db
			.select({ email: mitglied.email })
			.from(mitglied)
			.where(eq(mitglied.id, l.mitgliedId));
		expect(zeile.email).toBe(neu);
	});
});
