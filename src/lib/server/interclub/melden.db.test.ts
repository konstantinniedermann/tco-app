import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import {
	legeEigeneDatenbankAn,
	ZEIT_EIGENE_DB,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import {
	icBegegnung,
	icBericht,
	icEntscheid,
	icFolgen,
	icGemeldet,
	icPartie,
	icSpieler,
	icTeam,
	konto,
	mitglied,
	pushAbo
} from '../db/schema.ts';
import { erstelleSitzung, pruefeSitzung } from '../login/sitzung.ts';
import { meldeEndstaende, type MeldeDienste } from './melden.ts';

// Mittwoch, 12. Mai 2026, 10:00 in Zürich.
const JETZT = new Date('2026-05-12T08:00:00Z');
const ADRESSE = 'https://mytco.example/';

let e: EigeneDatenbank;
beforeAll(async () => {
	e = await legeEigeneDatenbankAn('icmelden');
}, 30_000);
afterAll(async () => {
	await e.abbauen();
});

type Gesendet = { endpunkt: string; nutzlast: { titel: string; text: string; link: string } };
let gesendet: Gesendet[];
let antwort: 'ok' | 'ungueltig' | 'fehler';
let naechsteId: number;

const dienste = (o: Partial<MeldeDienste> = {}): MeldeDienste => ({
	db: e.db,
	push: async (abo, nutzlast) => {
		gesendet.push({ endpunkt: abo.endpunkt, nutzlast: JSON.parse(nutzlast) });
		return antwort;
	},
	adresse: ADRESSE,
	jetzt: () => JETZT,
	...o
});

beforeEach(async () => {
	gesendet = [];
	antwort = 'ok';
	naechsteId = 1000;
	await e.db.delete(icGemeldet);
	await e.db.delete(icFolgen);
	await e.db.delete(icTeam);
	const team = (teamId: number, liga: string, reihenfolge: number) => ({
		saison: 2026,
		teamId,
		wettbewerb: 'ic' as const,
		teamName: `Olten ${teamId}`,
		liga,
		gruppe: 1,
		reihenfolge
	});
	await e.db
		.insert(icTeam)
		.values([
			team(1, '2L Herren 1', 1),
			team(2, '3L Herren', 2),
			{ ...team(3, 'Alt', 1), saison: 2025, teamName: 'Olten 3' }
		]);
});

type Abo = { kontoId: number; endpunkt: string };
async function neuesKonto(
	o: { abo?: boolean; gesperrt?: boolean; status?: string; folgt?: number[] } = {}
): Promise<Abo> {
	const m = await legeMitgliedAn(e.db, {
		vorname: 'Vreni',
		nachname: `Muster-${randomUUID()}`
	});
	const endpunkt = `https://push.example/${randomUUID()}`;
	if (o.abo ?? true) {
		const kennung = await erstelleSitzung(e.db, m.kontoId, JETZT);
		const k = (await pruefeSitzung(e.db, kennung, JETZT))!.konto;
		await e.db.insert(pushAbo).values({
			endpunkt,
			sitzungHash: k.sitzungHash,
			kontoId: m.kontoId,
			p256dh: 'p',
			auth: 'a',
			eingerichtetAm: JETZT
		});
	}
	if (o.status)
		await e.db
			.update(mitglied)
			.set({ status: o.status, austrittAm: new Date() })
			.where(eq(mitglied.id, m.mitgliedId));
	if (o.gesperrt) await e.db.update(konto).set({ gesperrt: true }).where(eq(konto.id, m.kontoId));
	for (const teamId of o.folgt ?? [1])
		await e.db.insert(icFolgen).values({ kontoId: m.kontoId, teamId, seit: JETZT });
	return { kontoId: m.kontoId, endpunkt };
}

// Ein weiteres Gerät desselben Kontos: eigene Sitzung, eigenes Abo.
async function weiteresAbo(kontoId: number): Promise<string> {
	const endpunkt = `https://push.example/${randomUUID()}`;
	const kennung = await erstelleSitzung(e.db, kontoId, JETZT);
	const k = (await pruefeSitzung(e.db, kennung, JETZT))!.konto;
	await e.db.insert(pushAbo).values({
		endpunkt,
		sitzungHash: k.sitzungHash,
		kontoId,
		p256dh: 'p',
		auth: 'a',
		eingerichtetAm: JETZT
	});
	return endpunkt;
}

type Spiel = {
	teamId?: number;
	saison?: number;
	datum?: string;
	heim?: string;
	gast?: string;
	punkte?: [number | null, number | null];
	bericht?: boolean;
};
// Gruppenspiel; legt bei Bedarf den Spielbericht dazu.
async function spiel(o: Spiel = {}): Promise<number> {
	const id = naechsteId++;
	const teamId = o.teamId ?? 1;
	const saison = o.saison ?? 2026;
	const [hp, gp] = o.punkte ?? [8, 1];
	await e.db.insert(icBegegnung).values({
		saison,
		teamId,
		begegnungId: id,
		runde: 1,
		datum: o.datum ?? '2026-05-10',
		heim: o.heim ?? `Olten ${teamId}`,
		gast: o.gast ?? 'Villmergen',
		heimPunkte: hp,
		gastPunkte: gp
	});
	if (o.bericht ?? true) await bericht(saison, teamId, id);
	return id;
}
async function bericht(saison: number, teamId: number, begegnungId: number) {
	await e.db.insert(icBericht).values({
		saison,
		teamId,
		begegnungId,
		tcoHeim: true,
		tcoSaetze: 17,
		gegnerSaetze: 3,
		tcoGames: 120,
		gegnerGames: 60
	});
}
const gemeldet = async () => (await e.db.select().from(icGemeldet)).map((g) => g.begegnungId);

describe('meldeEndstaende', () => {
	test(
		'A-INTERCLUB-02: neuer Endstand mit Bericht: ein Push an das folgende Konto',
		ZEIT_EIGENE_DB,
		async () => {
			const k = await neuesKonto();
			const id = await spiel({ heim: 'Olten 1', gast: 'Villmergen' });
			expect(await meldeEndstaende(dienste())).toBe(1);
			expect(gesendet).toEqual([
				{
					endpunkt: k.endpunkt,
					nutzlast: {
						titel: 'Interclub',
						text: '2L Herren 1: Olten 1 – Villmergen 8:1',
						link: `https://mytco.example/interclub/1/${id}`
					}
				}
			]);
			expect(await gemeldet()).toEqual([id]);
		}
	);

	test(
		'Endstand ohne Bericht: nichts; nach Bericht im nächsten Lauf gemeldet',
		ZEIT_EIGENE_DB,
		async () => {
			await neuesKonto();
			const id = await spiel({ bericht: false });
			expect(await meldeEndstaende(dienste())).toBe(0);
			expect(gesendet).toEqual([]);
			expect(await gemeldet()).toEqual([]);
			await bericht(2026, 1, id);
			expect(await meldeEndstaende(dienste())).toBe(1);
			expect(gesendet).toHaveLength(1);
		}
	);

	test('ohne Endstand (Punkte fehlen): nichts', ZEIT_EIGENE_DB, async () => {
		await neuesKonto();
		await spiel({ punkte: [null, null] });
		expect(await meldeEndstaende(dienste())).toBe(0);
		expect(gesendet).toEqual([]);
	});

	test('zweiter Lauf: kein zweiter Push', ZEIT_EIGENE_DB, async () => {
		await neuesKonto();
		await spiel();
		expect(await meldeEndstaende(dienste())).toBe(1);
		expect(await meldeEndstaende(dienste())).toBe(0);
		expect(gesendet).toHaveLength(1);
	});

	test('älter als 7 Tage, in der Zukunft oder andere Saison: nichts', ZEIT_EIGENE_DB, async () => {
		await neuesKonto();
		await spiel({ datum: '2026-05-04' });
		await spiel({ datum: '2026-05-13' });
		await e.db.insert(icTeam).values({
			saison: 2025,
			teamId: 1,
			wettbewerb: 'ic',
			teamName: 'Olten 1',
			liga: 'Alt',
			gruppe: 1,
			reihenfolge: 1
		});
		await spiel({ saison: 2025, datum: '2026-05-10' });
		expect(await meldeEndstaende(dienste())).toBe(0);
		expect(gesendet).toEqual([]);
		expect(await gemeldet()).toEqual([]);
	});

	test('genau 7 Tage zurück und heute zählen', ZEIT_EIGENE_DB, async () => {
		await neuesKonto();
		await spiel({ datum: '2026-05-05' });
		await spiel({ datum: '2026-05-12' });
		expect(await meldeEndstaende(dienste())).toBe(2);
	});

	test(
		'ohne Follower: eingetragen, kein Push; wer danach folgt, bekommt ihn nicht',
		ZEIT_EIGENE_DB,
		async () => {
			const id = await spiel();
			expect(await meldeEndstaende(dienste())).toBe(1);
			expect(await gemeldet()).toEqual([id]);
			await neuesKonto();
			expect(await meldeEndstaende(dienste())).toBe(0);
			expect(gesendet).toEqual([]);
		}
	);

	test(
		'Team, dem niemand folgt: nur der Follower des anderen Teams bekommt den Push',
		ZEIT_EIGENE_DB,
		async () => {
			const k1 = await neuesKonto({ folgt: [1] });
			await neuesKonto({ folgt: [2] });
			await spiel({ teamId: 1 });
			await meldeEndstaende(dienste());
			expect(gesendet.map((g) => g.endpunkt)).toEqual([k1.endpunkt]);
		}
	);

	test(
		'zwei Endstände eines Kontos im selben Lauf: ein Push, zwei Zeilen, Link auf die Übersicht',
		ZEIT_EIGENE_DB,
		async () => {
			const k = await neuesKonto({ folgt: [1, 2] });
			await spiel({
				teamId: 2,
				datum: '2026-05-11',
				heim: 'Olten 2',
				gast: 'Zofingen',
				punkte: [3, 6]
			});
			await spiel({ teamId: 1, datum: '2026-05-10', gast: 'Villmergen' });
			expect(await meldeEndstaende(dienste())).toBe(2);
			expect(gesendet).toHaveLength(1);
			expect(gesendet[0].endpunkt).toBe(k.endpunkt);
			expect(gesendet[0].nutzlast).toEqual({
				titel: 'Interclub',
				text: '2L Herren 1: Olten 1 – Villmergen 8:1\n3L Herren: Olten 2 – Zofingen 3:6',
				link: 'https://mytco.example/interclub'
			});
		}
	);

	test('TCO gegen TCO, Konto folgt beiden Teams: eine Zeile', ZEIT_EIGENE_DB, async () => {
		await neuesKonto({ folgt: [1, 2] });
		const id = naechsteId;
		await spiel({ teamId: 1, heim: 'Olten 1', gast: 'Olten 2', punkte: [5, 4] });
		naechsteId = id;
		await spiel({ teamId: 2, heim: 'Olten 1', gast: 'Olten 2', punkte: [5, 4] });
		expect(await meldeEndstaende(dienste())).toBe(1);
		expect(gesendet).toHaveLength(1);
		expect(gesendet[0].nutzlast.text).toBe('2L Herren 1: Olten 1 – Olten 2 5:4');
		expect(gesendet[0].nutzlast.link).toBe(`https://mytco.example/interclub/1/${id}`);
	});

	test('Auf-/Abstiegsspiel wird gemeldet wie ein Gruppenspiel', ZEIT_EIGENE_DB, async () => {
		const k = await neuesKonto();
		const id = naechsteId++;
		await e.db.insert(icEntscheid).values({
			saison: 2026,
			teamId: 1,
			begegnungId: id,
			art: 'aufstieg',
			runde: 1,
			datum: '2026-05-11',
			heimId: 1,
			heimName: 'Olten 1',
			heimPunkte: 6,
			heimMarkiert: true,
			gastId: 77,
			gastName: 'Baden 1',
			gastPunkte: 3,
			gastMarkiert: false
		});
		await bericht(2026, 1, id);
		expect(await meldeEndstaende(dienste())).toBe(1);
		expect(gesendet).toEqual([
			{
				endpunkt: k.endpunkt,
				nutzlast: {
					titel: 'Interclub',
					text: '2L Herren 1: Olten 1 – Baden 1 6:3',
					link: `https://mytco.example/interclub/1/${id}`
				}
			}
		]);
	});

	test(
		'ohne Abo, gesperrtes Konto, ausgetretenes Mitglied: kein Push',
		ZEIT_EIGENE_DB,
		async () => {
			await neuesKonto({ abo: false });
			await neuesKonto({ gesperrt: true });
			await neuesKonto({ status: 'ausgetreten' });
			await spiel();
			expect(await meldeEndstaende(dienste())).toBe(1);
			expect(gesendet).toEqual([]);
		}
	);

	test('push null (kein VAPID): eingetragen, kein Versand', ZEIT_EIGENE_DB, async () => {
		await neuesKonto();
		const id = await spiel();
		expect(await meldeEndstaende(dienste({ push: null }))).toBe(1);
		expect(await gemeldet()).toEqual([id]);
		expect(gesendet).toEqual([]);
	});

	test(
		'Push-Dienst meldet ungueltig: Abo gelöscht, Begegnung bleibt gemeldet',
		ZEIT_EIGENE_DB,
		async () => {
			const k = await neuesKonto();
			const id = await spiel();
			antwort = 'ungueltig';
			expect(await meldeEndstaende(dienste())).toBe(1);
			expect(await e.db.select().from(pushAbo).where(eq(pushAbo.endpunkt, k.endpunkt))).toEqual([]);
			expect(await gemeldet()).toEqual([id]);
			expect(await meldeEndstaende(dienste())).toBe(0);
		}
	);

	test('Nutzlast enthält keine Spielernamen aus ic_spieler', ZEIT_EIGENE_DB, async () => {
		await neuesKonto();
		const id = await spiel();
		await e.db.insert(icPartie).values({
			saison: 2026,
			teamId: 1,
			begegnungId: id,
			art: 'einzel',
			position: 1,
			saetze: ['6:4', '6:3']
		});
		await e.db.insert(icSpieler).values({
			saison: 2026,
			teamId: 1,
			begegnungId: id,
			art: 'einzel',
			position: 1,
			seite: 'tco',
			nr: 1,
			name: 'Zbigniew Erfunden',
			klassierung: 'R5',
			stId: 1,
			rangliste: 1
		});
		await meldeEndstaende(dienste());
		expect(gesendet).toHaveLength(1);
		expect(JSON.stringify(gesendet[0].nutzlast)).not.toContain('Erfunden');
	});

	test(
		'wirft nie: Datenbankfehler gibt 0 und loggt nur den festen Text',
		ZEIT_EIGENE_DB,
		async () => {
			const kaputt = {
				select: () => {
					throw new Error('Datenbank weg: geheim@example.org');
				}
			} as unknown as MeldeDienste['db'];
			const log = vi.spyOn(console, 'error').mockImplementation(() => {});
			try {
				expect(await meldeEndstaende(dienste({ db: kaputt }))).toBe(0);
				expect(log.mock.calls).toEqual([['Interclub-Melden fehlgeschlagen']]);
			} finally {
				log.mockRestore();
			}
		}
	);

	test(
		'TCO gegen TCO, Konto folgt nur dem zweiten Team: dessen Liga und Link',
		ZEIT_EIGENE_DB,
		async () => {
			await neuesKonto({ folgt: [2] });
			const id = naechsteId;
			await spiel({ teamId: 1, heim: 'Olten 1', gast: 'Olten 2', punkte: [5, 4] });
			naechsteId = id;
			await spiel({ teamId: 2, heim: 'Olten 1', gast: 'Olten 2', punkte: [5, 4] });
			expect(await meldeEndstaende(dienste())).toBe(1);
			expect(gesendet).toHaveLength(1);
			expect(gesendet[0].nutzlast.text).toBe('3L Herren: Olten 1 – Olten 2 5:4');
			expect(gesendet[0].nutzlast.link).toBe(`https://mytco.example/interclub/2/${id}`);
		}
	);
	test('Konto mit zwei Abos: beide bekommen den Push', ZEIT_EIGENE_DB, async () => {
		const k = await neuesKonto();
		const zweites = await weiteresAbo(k.kontoId);
		const id = await spiel({ heim: 'Olten 1', gast: 'Villmergen' });
		expect(await meldeEndstaende(dienste())).toBe(1);
		const nutzlast = {
			titel: 'Interclub',
			text: '2L Herren 1: Olten 1 – Villmergen 8:1',
			link: `https://mytco.example/interclub/1/${id}`
		};
		expect(gesendet).toHaveLength(2);
		expect(gesendet).toEqual(
			expect.arrayContaining([
				{ endpunkt: k.endpunkt, nutzlast },
				{ endpunkt: zweites, nutzlast }
			])
		);
	});

	test('zwei Konten im selben Lauf bekommen je genau ihren Push', ZEIT_EIGENE_DB, async () => {
		const a = await neuesKonto({ folgt: [1] });
		const b = await neuesKonto({ folgt: [2] });
		const id1 = await spiel({ teamId: 1, heim: 'Olten 1', gast: 'Villmergen', punkte: [8, 1] });
		const id2 = await spiel({ teamId: 2, heim: 'Aarau', gast: 'Olten 2', punkte: [3, 6] });
		expect(await meldeEndstaende(dienste())).toBe(2);
		expect(gesendet).toHaveLength(2);
		expect(gesendet).toEqual(
			expect.arrayContaining([
				{
					endpunkt: a.endpunkt,
					nutzlast: {
						titel: 'Interclub',
						text: '2L Herren 1: Olten 1 – Villmergen 8:1',
						link: `https://mytco.example/interclub/1/${id1}`
					}
				},
				{
					endpunkt: b.endpunkt,
					nutzlast: {
						titel: 'Interclub',
						text: '3L Herren: Aarau – Olten 2 3:6',
						link: `https://mytco.example/interclub/2/${id2}`
					}
				}
			])
		);
	});
});
