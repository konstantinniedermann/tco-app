import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { konto, mitglied, sitzung } from '../db/schema.ts';
import { erstelleBremsen } from './bremse.ts';
import { BRIEF_CODE_GUELTIG_MS, formatiereBriefCode } from './codes.ts';
import { erstelleLoginDienst } from './dienst.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

const SCHLUESSEL = 'x'.repeat(40);
const KONTAKT = 'kontakt@example.org';
const start = new Date('2026-11-02T12:00:00Z');

function baueDienst(zeit: { t: Date } = { t: start }) {
	const dienst = erstelleLoginDienst({
		db,
		schluessel: SCHLUESSEL,
		kontakt: KONTAKT,
		mailer: async () => {},
		bremsen: erstelleBremsen(),
		jetzt: () => zeit.t
	});
	return { dienst, zeit };
}

const holeKonto = async (kontoId: number) =>
	(await db.select().from(konto).where(eq(konto.id, kontoId)))[0];

describe('Brief-Code', () => {
	test('FR-24: Brief-Code gilt nur einmal', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		const { code, gueltigBis } = await dienst.stelleBriefCodeAus(kontoId);
		expect(code).toMatch(/^[A-Z2-9]{10}$/);
		expect(gueltigBis).toEqual(new Date(start.getTime() + BRIEF_CODE_GUELTIG_MS));
		const erster = await dienst.loginMitBriefCode(code, 'ip-1');
		expect(erster.ergebnis).toBe('ok');
		expect(await dienst.loginMitBriefCode(code, 'ip-1')).toEqual({
			ergebnis: 'benutzt',
			kontakt: KONTAKT
		});
		if (erster.ergebnis === 'ok') {
			expect(await dienst.pruefeSitzung(erster.kennung)).not.toBeNull();
			await dienst.beendeSitzung(erster.kennung);
			expect(await dienst.pruefeSitzung(erster.kennung)).toBeNull();
		}
	});

	test('A-LOGIN-07: Login mit Brief-Code setzt den Passkey-Hinweis', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		const { code } = await dienst.stelleBriefCodeAus(kontoId);
		expect((await dienst.loginMitBriefCode(code, 'ip-hinweis')).ergebnis).toBe('ok');
		const zeilen = await db.select().from(sitzung).where(eq(sitzung.kontoId, kontoId));
		expect(zeilen).toHaveLength(1);
		expect(zeilen[0].passkeyHinweis).toBe(true);
	});

	test('RR-04: Datenbank enthält den Brief-Code nicht im Klartext', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		const { code } = await dienst.stelleBriefCodeAus(kontoId);
		const k = await holeKonto(kontoId);
		expect(k.briefCodeHash).not.toBeNull();
		expect(JSON.stringify(k)).not.toContain(code);
	});

	test('stelleBriefCodeAus: unbekanntes Konto wirft', async () => {
		const { dienst } = baueDienst();
		await expect(dienst.stelleBriefCodeAus(2_000_000_000)).rejects.toThrow();
	});

	test('neuer Brief-Code ersetzt nur den alten Brief-Code', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		await db
			.update(konto)
			.set({ mailCodeHash: 'offen', mailCodeAblauf: start, mailCodeFehlversuche: 2 })
			.where(eq(konto.id, kontoId));
		const alt = await dienst.stelleBriefCodeAus(kontoId);
		const neu = await dienst.stelleBriefCodeAus(kontoId);
		expect((await dienst.loginMitBriefCode(alt.code, 'ip-2')).ergebnis).toBe('falsch');
		const k = await holeKonto(kontoId);
		expect(k.mailCodeHash).toBe('offen');
		expect(k.mailCodeFehlversuche).toBe(2);
		expect((await dienst.loginMitBriefCode(neu.code, 'ip-2')).ergebnis).toBe('ok');
	});

	test('Login mit Brief-Code macht den Mail-Code ungültig', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		await db
			.update(konto)
			.set({ mailCodeHash: 'offen', mailCodeAblauf: start, mailCodeFehlversuche: 3 })
			.where(eq(konto.id, kontoId));
		const { code } = await dienst.stelleBriefCodeAus(kontoId);
		await dienst.loginMitBriefCode(code, 'ip-3');
		const k = await holeKonto(kontoId);
		expect(k.mailCodeHash).toBeNull();
		expect(k.mailCodeAblauf).toBeNull();
		expect(k.mailCodeFehlversuche).toBe(0);
	});

	test('Login mit altem Cookie löscht dessen Sitzung', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		const a = await dienst.stelleBriefCodeAus(kontoId);
		const ersterLogin = await dienst.loginMitBriefCode(a.code, 'ip-4');
		const b = await dienst.stelleBriefCodeAus(kontoId);
		if (ersterLogin.ergebnis !== 'ok') throw new Error('erwartet ok');
		const zweiter = await dienst.loginMitBriefCode(b.code, 'ip-4', ersterLogin.kennung);
		expect(zweiter.ergebnis).toBe('ok');
		expect(await dienst.pruefeSitzung(ersterLogin.kennung)).toBeNull();
	});

	test('beendeAlleSitzungen beendet die Sitzung', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		const { code } = await dienst.stelleBriefCodeAus(kontoId);
		const r = await dienst.loginMitBriefCode(code, 'ip-5');
		if (r.ergebnis !== 'ok') throw new Error('erwartet ok');
		await dienst.beendeAlleSitzungen(kontoId);
		expect(await dienst.pruefeSitzung(r.kennung)).toBeNull();
	});

	test('Brief-Code nach 90 Tagen abgelaufen → falsch', async () => {
		const { dienst, zeit } = baueDienst({ t: start });
		const { kontoId } = await legeMitgliedAn(db);
		const { code } = await dienst.stelleBriefCodeAus(kontoId);
		zeit.t = new Date(start.getTime() + BRIEF_CODE_GUELTIG_MS + 1);
		expect(await dienst.loginMitBriefCode(code, 'ip-6')).toEqual({ ergebnis: 'falsch' });
	});

	test('Eingabe mit Kleinbuchstaben und Bindestrich wird angenommen (UI-07)', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		const { code } = await dienst.stelleBriefCodeAus(kontoId);
		const eingabe = ` ${formatiereBriefCode(code).toLowerCase()} `;
		expect((await dienst.loginMitBriefCode(eingabe, 'ip-7')).ergebnis).toBe('ok');
	});

	test('gesperrtes Konto: gültiger Code → falsch, Code bleibt unverbraucht', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		const { code } = await dienst.stelleBriefCodeAus(kontoId);
		await db.update(konto).set({ gesperrt: true }).where(eq(konto.id, kontoId));
		expect(await dienst.loginMitBriefCode(code, 'ip-8')).toEqual({ ergebnis: 'falsch' });
		expect(await dienst.loginMitBriefCode(code, 'ip-8')).toEqual({ ergebnis: 'falsch' });
		expect((await holeKonto(kontoId)).briefCodeBenutztAm).toBeNull();
		await db.update(konto).set({ gesperrt: false }).where(eq(konto.id, kontoId));
		expect((await dienst.loginMitBriefCode(code, 'ip-8b')).ergebnis).toBe('ok');
	});

	test('nicht aktives Mitglied: gültiger Code → falsch, Code bleibt unverbraucht', async () => {
		const { dienst } = baueDienst();
		const { kontoId, mitgliedId } = await legeMitgliedAn(db);
		const { code } = await dienst.stelleBriefCodeAus(kontoId);
		await db.update(mitglied).set({ status: 'ausgetreten' }).where(eq(mitglied.id, mitgliedId));
		expect(await dienst.loginMitBriefCode(code, 'ip-9')).toEqual({ ergebnis: 'falsch' });
		expect((await holeKonto(kontoId)).briefCodeBenutztAm).toBeNull();
	});

	test('benutzter Code eines später gesperrten Kontos → falsch', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		const { code } = await dienst.stelleBriefCodeAus(kontoId);
		await dienst.loginMitBriefCode(code, 'ip-10');
		await db.update(konto).set({ gesperrt: true }).where(eq(konto.id, kontoId));
		expect(await dienst.loginMitBriefCode(code, 'ip-10')).toEqual({ ergebnis: 'falsch' });
	});

	test('SI-02: 10 Fehlversuche pro IP, dann zu-viele, auch für einen gültigen Code', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		const { code } = await dienst.stelleBriefCodeAus(kontoId);
		for (let i = 0; i < 10; i++) {
			expect(await dienst.loginMitBriefCode('AAAAAAAAAA', 'ip-11')).toEqual({
				ergebnis: 'falsch'
			});
		}
		expect(await dienst.loginMitBriefCode('AAAAAAAAAA', 'ip-11')).toEqual({
			ergebnis: 'zu-viele'
		});
		expect(await dienst.loginMitBriefCode(code, 'ip-11')).toEqual({ ergebnis: 'zu-viele' });
		expect((await holeKonto(kontoId)).briefCodeBenutztAm).toBeNull();
		expect((await dienst.loginMitBriefCode(code, 'ip-12')).ergebnis).toBe('ok');
	});

	test('SI-02: zwei Adressen desselben IPv6-/64-Netzes teilen sich die 10 Fehlversuche', async () => {
		const { dienst } = baueDienst();
		for (let i = 0; i < 10; i++) {
			const ip = `2001:db8:a:b::${i + 1}`;
			expect((await dienst.loginMitBriefCode('AAAAAAAAAA', ip)).ergebnis).toBe('falsch');
		}
		expect((await dienst.loginMitBriefCode('AAAAAAAAAA', '2001:db8:a:b:ffff::9')).ergebnis).toBe(
			'zu-viele'
		);
		expect((await dienst.loginMitBriefCode('AAAAAAAAAA', '2001:db8:a:c::1')).ergebnis).toBe(
			'falsch'
		);
	});

	test('erfolgreiche und benutzte Logins zählen nicht in der Bremse', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		const { code } = await dienst.stelleBriefCodeAus(kontoId);
		await dienst.loginMitBriefCode(code, 'ip-13');
		for (let i = 0; i < 15; i++) {
			expect((await dienst.loginMitBriefCode(code, 'ip-13')).ergebnis).toBe('benutzt');
		}
	});

	test('unsinnige Eingabe (Zahl, null, 10 000 Zeichen) → falsch, ohne Fehler', async () => {
		const { dienst } = baueDienst();
		for (const eingabe of [42, null, undefined, {}, 'x'.repeat(10_000), '']) {
			expect(await dienst.loginMitBriefCode(eingabe, 'ip-14')).toEqual({ ergebnis: 'falsch' });
		}
	});

	test('Review Focus 4: zwei gleichzeitige Logins mit demselben Code → genau ein ok', async () => {
		const { dienst } = baueDienst();
		const { kontoId } = await legeMitgliedAn(db);
		const { code } = await dienst.stelleBriefCodeAus(kontoId);
		const ergebnisse = await Promise.all([
			dienst.loginMitBriefCode(code, 'ip-15'),
			dienst.loginMitBriefCode(code, 'ip-16')
		]);
		expect(ergebnisse.filter((e) => e.ergebnis === 'ok')).toHaveLength(1);
		expect(ergebnisse.filter((e) => e.ergebnis === 'benutzt')).toHaveLength(1);
	});
});
