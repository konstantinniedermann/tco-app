// Musterbrief als PDF aus einem erfundenen Mitglied (DS-08: keine echten Personendaten).
// Aufruf über `make musterbrief`. Der Code wird frisch erzeugt und nirgends gespeichert.
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { baueBriefHtml } from '../src/lib/server/brief/brief.ts';
import { BRIEF_CODE_GUELTIG_MS, erzeugeBriefCode } from '../src/lib/server/login/codes.ts';

const ZIEL = 'build/musterbrief.pdf';

const html = baueBriefHtml(
	{
		vorname: 'Erika',
		nachname: 'Beispiel',
		strasse: 'Erfundenweg 7',
		plz: '4600',
		ort: 'Olten',
		code: erzeugeBriefCode(),
		gueltigBis: new Date(Date.now() + BRIEF_CODE_GUELTIG_MS),
		// Annahme K-21 und K-10: Einstellungen aus der Umgebung, sonst wie in .env.example.
		kontakt: process.env.MYTCO_KONTAKT || 'das Sekretariat (erfunden), sekretariat@example.org',
		adresse: process.env.MYTCO_ADRESSE || 'http://localhost:5173'
	},
	readFileSync('src/lib/design/tokens.css', 'utf-8')
);

mkdirSync('build', { recursive: true });
const browser = await chromium.launch();
try {
	const seite = await browser.newPage();
	await seite.setContent(html);
	await seite.pdf({ path: ZIEL, format: 'A4', printBackground: true });
	console.log(`Musterbrief: ${ZIEL}`);
} finally {
	await browser.close();
}
