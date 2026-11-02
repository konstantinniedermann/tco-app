// Musterbrief als PDF aus einem erfundenen Mitglied (DS-08: keine echten Personendaten).
// Aufruf über `make musterbrief` (lädt bewusst keine .env). Der Code wird frisch erzeugt und
// nirgends gespeichert.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { baueBriefHtml } from '../src/lib/server/brief/brief.ts';
import { STANDARD_ADRESSE } from '../src/lib/server/einstellungen.ts';
import { BRIEF_CODE_GUELTIG_MS, erzeugeBriefCode } from '../src/lib/server/login/codes.ts';

// Eigener Ordner: `build/` leert jeder Build.
const ORDNER = 'musterbrief';
const ZIEL = `${ORDNER}/musterbrief.pdf`;

const html = baueBriefHtml(
	{
		vorname: 'Erika',
		nachname: 'Beispiel',
		strasse: 'Erfundenweg 7',
		plz: '4600',
		ort: 'Olten',
		code: erzeugeBriefCode(),
		gueltigBis: new Date(Date.now() + BRIEF_CODE_GUELTIG_MS),
		// Annahme K-21: Ansprechperson aus der Umgebung, sonst erfunden wie in .env.example.
		kontakt: process.env.MYTCO_KONTAKT || 'das Sekretariat (erfunden), sekretariat@example.org',
		// Annahme K-10: App-Adresse nur, wenn ausdrücklich gesetzt, sonst die Live-Adresse.
		adresse: process.env.MYTCO_ADRESSE || STANDARD_ADRESSE
	},
	readFileSync('src/lib/design/tokens.css', 'utf-8')
);

/** Seiten im PDF von Chromium (jede Seite ist ein eigenes `/Type /Page`-Objekt). */
function zaehleSeiten(pdf: Buffer): number {
	return (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
}

mkdirSync(ORDNER, { recursive: true });
rmSync(ZIEL, { force: true });
const browser = await chromium.launch();
try {
	const seite = await browser.newPage();
	await seite.setContent(html);
	const pdf = await seite.pdf({ format: 'A4', printBackground: true });
	const seiten = zaehleSeiten(pdf);
	if (seiten !== 1) {
		console.error(
			`Abbruch: Der Musterbrief hat ${seiten} Seiten statt einer. Schrift (--brief-schrift) ` +
				'oder Texte verkleinern, bis alles auf eine A4-Seite passt.'
		);
		process.exitCode = 1;
	} else {
		writeFileSync(ZIEL, pdf);
		console.log(`Musterbrief: ${ZIEL}`);
	}
} finally {
	await browser.close();
}
