import { randomUUID } from 'node:crypto';
import type { Db } from '../../src/lib/server/db/index.ts';
import { konto, mitglied } from '../../src/lib/server/db/schema.ts';

type Teil = Partial<{ vorname: string; status: string; gesperrt: boolean }>;

// Legt ein erfundenes Mitglied samt Konto an; die Adresse ist pro Aufruf eindeutig.
export async function legeMitgliedAn(db: Db, teil: Teil = {}) {
	const email = `test-${randomUUID()}@example.org`;
	const vorname = teil.vorname ?? 'Test';
	const [m] = await db
		.insert(mitglied)
		.values({
			vorname,
			nachname: 'Muster',
			strasse: 'Erfundenweg 1',
			plz: '4600',
			ort: 'Olten',
			email,
			...(teil.status === undefined ? {} : { status: teil.status })
		})
		.returning({ id: mitglied.id });
	const [k] = await db
		.insert(konto)
		.values({ mitgliedId: m.id, gesperrt: teil.gesperrt ?? false })
		.returning({ id: konto.id });
	return { mitgliedId: m.id, kontoId: k.id, email, vorname };
}
