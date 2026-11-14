// Holt die Interclub-Resultate eines Jahres von Swiss Tennis und ersetzt damit den Stand in der Datenbank.
// Aufruf über `make ic-import JAHR=2026` (lädt .env). Verein: IC_VEREIN, Vorgabe 2202.
import { erstelleDb } from '../src/lib/server/db/index.ts';
import { importiereSaison } from '../src/lib/server/interclub/import.ts';

const jahr = Number(process.env.JAHR);
const verein = Number(process.env.IC_VEREIN || '2202');
const url = process.env.DATABASE_URL;
if (!Number.isInteger(jahr) || jahr < 2000 || !Number.isInteger(verein) || verein <= 0) {
	console.error('Aufruf: make ic-import JAHR=2026 (optional IC_VEREIN)');
	process.exit(1);
}
if (!url) {
	console.error('DATABASE_URL fehlt');
	process.exit(1);
}

const db = erstelleDb(url);
try {
	const worte = await importiereSaison(
		{
			db,
			holen: (u) => fetch(u),
			jetzt: () => new Date(),
			pause: () => new Promise((r) => setTimeout(r, 1500))
		},
		jahr,
		verein
	);
	const text = Object.entries(worte)
		.map(([wettbewerb, wort]) => `${wettbewerb}: ${wort}`)
		.join(', ');
	console.log(text);
	if (Object.values(worte).some((w) => w === 'form' || w === 'stoerung')) process.exitCode = 1;
} finally {
	await db.$client.end();
}
