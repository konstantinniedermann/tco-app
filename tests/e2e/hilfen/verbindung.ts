// Die Verbindung der E2E-Hilfen: eine Datenbank und ein Login-Dienst je Testprozess. Nur für die
// Hilfen in diesem Ordner; Konten, Turniere, Anlässe und Mails liegen in den Dateien daneben.
import { erstelleDb, type Db } from '../../../src/lib/server/db/index.ts';
import { erstelleBremsen } from '../../../src/lib/server/login/bremse.ts';
import { erstelleLoginDienst, type LoginDienst } from '../../../src/lib/server/login/dienst.ts';
import { DATENBANK_URL, e2eEinstellungen } from './umgebung.ts';

let verbindung: { db: Db; dienst: LoginDienst } | undefined;

export function hole() {
	if (!verbindung) {
		const db = erstelleDb(DATENBANK_URL);
		const einstellungen = e2eEinstellungen('');
		const dienst = erstelleLoginDienst({
			db,
			schluessel: einstellungen.MYTCO_CODE_SCHLUESSEL,
			kontakt: einstellungen.MYTCO_KONTAKT,
			mailer: async () => {
				throw new Error('Die E2E-Hilfen verschicken keine Mails');
			},
			bremsen: erstelleBremsen()
		});
		verbindung = { db, dienst };
	}
	return verbindung;
}

export async function schliesseVerbindung(): Promise<void> {
	await verbindung?.db.$client.end();
	verbindung = undefined;
}
