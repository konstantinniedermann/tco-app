import { randomUUID } from 'node:crypto';
import type { Db } from '../../src/lib/server/db/index.ts';
import { konto, kontoRolle, mitglied } from '../../src/lib/server/db/schema.ts';

type Teil = Partial<{
	vorname: string;
	rufname: string | null;
	nachname: string;
	status: string;
	gesperrt: boolean;
	rollen: string[];
}>;

// Legt ein erfundenes Mitglied samt Konto an; die Adresse ist pro Aufruf eindeutig.
export async function legeMitgliedAn(db: Db, teil: Teil = {}) {
	const email = `test-${randomUUID()}@example.org`;
	const vorname = teil.vorname ?? 'Test';
	const [m] = await db
		.insert(mitglied)
		.values({
			vorname,
			rufname: teil.rufname ?? null,
			nachname: teil.nachname ?? 'Muster',
			strasse: 'Erfundenweg 1',
			plz: '4600',
			ort: 'Olten',
			email,
			...(teil.status === undefined ? {} : { status: teil.status }),
			...(teil.status === 'ausgetreten' ? { austrittAm: new Date() } : {}),
			...(teil.status === 'vorgemerkt' ? { vorgemerktAm: new Date(), statusVorher: 'aktiv' } : {})
		})
		.returning({ id: mitglied.id });
	const [k] = await db
		.insert(konto)
		.values({ mitgliedId: m.id, gesperrt: teil.gesperrt ?? false })
		.returning({ id: konto.id });
	if (teil.rollen?.length) {
		await db.insert(kontoRolle).values(teil.rollen.map((rolle) => ({ kontoId: k.id, rolle })));
	}
	return { mitgliedId: m.id, kontoId: k.id, email, vorname };
}
