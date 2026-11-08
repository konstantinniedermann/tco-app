import { mkdirSync, readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { baueBriefHtml } from '../../src/lib/server/brief/brief.ts';
import {
	BRIEF_CODE_GUELTIG_MS,
	erzeugeBriefCode,
	formatiereBriefCode
} from '../../src/lib/server/login/codes.ts';
import {
	holeMailCode,
	legeAdminMitBriefCodeAn,
	legeKontoAn,
	legeKontoMitBriefCodeAn,
	legeRollenkontoMitBriefCodeAn,
	leereStrasse,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// Seite Briefe (A-LOGIN-01, Etappe 2a von #43). Alle Browser kommen von 127.0.0.1 an denselben
// Server: je Test ein Admin-Login mit Brief-Code und eine Code-Bestätigung an eine neue Adresse.
// Die Liste zeigt alle aktiven Mitglieder der gemeinsamen Test-Datenbank, die MyTCO noch nie
// geöffnet haben; die Tests wählen nur ihre eigenen Zeilen (nie «Alle auswählen»).

// Bilder für den Vergleich mit dem Entwurf (#43): nur mit SCREENSHOTS=<Ordner>, nie im normalen Lauf.
const BILDER = process.env.SCREENSHOTS;

// Die Liste zeigt alle noch nie angemeldeten Mitglieder der Test-Datenbank (lokal über tausend
// Zeilen); axe und das ganzseitige Bildschirmfoto brauchen dafür länger als 30 s.
test.describe.configure({ timeout: 90_000 });

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

async function bild(seite: Page | Locator, projekt: string, name: string, ganz = false) {
	if (!BILDER) return;
	mkdirSync(BILDER, { recursive: true });
	const pfad = `${BILDER}/${name}-${projekt}.png`;
	if ('goto' in seite) await seite.screenshot({ path: pfad, fullPage: ganz });
	else await seite.screenshot({ path: pfad });
}

// WebKit meldet beim Screenshot sein eigenes Stylesheet als CSP-Verstoss (siehe hilfen/seite.ts).
const ohneScreenshotStil = (fehler: string[]) =>
	BILDER ? fehler.filter((f) => !f.startsWith('Refused to apply a stylesheet')) : fehler;

/** Nachname, der pro Projekt und Lauf eindeutig ist (die Test-Datenbank überdauert die Läufe). */
const eindeutig = (stamm: string, info: TestInfo) =>
	`${stamm}${info.project.name}${Date.now().toString(36)}`;

/** Meldet ein neues Admin-Konto an und bestätigt die Verwaltung mit dem Mail-Code. */
async function meldeAdminAn(page: Page, nurMytco = false) {
	const admin = nurMytco
		? await legeRollenkontoMitBriefCodeAn('Mia', ['mytco'])
		: await legeAdminMitBriefCodeAn('Ada');
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(admin.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${admin.vorname}` })).toBeVisible();
	await wartetAufVorladen(page);
	await page.goto('/verwaltung');
	await expect(page).toHaveURL(/\/verwaltung\/bestaetigen$/);
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page.getByLabel('Code aus der Mail').fill(await holeMailCode(admin.email));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Mitglieder' })).toBeVisible();
}

async function oeffneBriefe(page: Page) {
	await page.goto('/verwaltung/briefe');
	await expect(page.getByRole('heading', { level: 1, name: 'Briefe' })).toBeVisible();
}

const zeile = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });

/** Wählt die Zeile, erzeugt über die Rückfrage einen Brief und wartet auf die Druckansicht. */
async function erzeugeBriefFuer(page: Page, name: string, vorname: string) {
	await zeile(page, name).getByRole('checkbox').check();
	await page.getByRole('button', { name: 'Briefe erzeugen (1)' }).click();
	const frage = page.getByRole('dialog', { name: '1 Brief erzeugen?' });
	await frage.getByRole('button', { name: 'Briefe erzeugen', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${vorname}` })).toBeVisible();
}

test('A-LOGIN-01: Serie – Auswahl, Rückfrage, Druckansicht, Code meldet an', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const projekt = info.project.name;
	const nachname = eindeutig('Serie', info);
	const ziel = await legeKontoAn('Berta', nachname);
	const name = `${nachname}, Berta`;
	await meldeAdminAn(page);
	await oeffneBriefe(page);

	await expect(
		page.getByText(
			'Mitglieder, die MyTCO noch nie geöffnet haben. Ein neuer Code ersetzt den alten.'
		)
	).toBeVisible();
	const z = zeile(page, name);
	await expect(z).toContainText('noch kein Brief');
	const erzeugen = page.getByRole('button', { name: /^Briefe erzeugen \(\d+\)$/ });
	await expect(erzeugen).toHaveText('Briefe erzeugen (0)');
	await expect(erzeugen).toBeDisabled();
	await pruefeBildschirm(page, info, 'briefe-liste');
	await bild(page, projekt, 'briefe-liste');

	await z.getByRole('checkbox', { name: `Auswählen: ${name}` }).check();
	await page.getByRole('button', { name: 'Briefe erzeugen (1)' }).click();
	const frage = page.getByRole('dialog', { name: '1 Brief erzeugen?' });
	await expect(frage).toBeVisible();
	await expect(frage).toContainText(
		'Die Codes erscheinen nur in der Druckansicht. Schliesst du sie ohne zu drucken, erzeugst du neue Briefe.'
	);
	await pruefeBildschirm(page, info, 'briefe-rueckfrage');
	await bild(page, projekt, 'briefe-rueckfrage');
	// Ein Doppelklick stellt nur einen Code aus (ein Verlaufseintrag, unten geprüft).
	await frage.getByRole('button', { name: 'Briefe erzeugen', exact: true }).dblclick();

	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Berta' })).toBeVisible();
	await expect(page.locator('.brief')).toHaveCount(1);
	await expect(
		page.getByText('Die Codes stehen nur hier. Drucke jetzt oder speichere als PDF.')
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Drucken oder als PDF speichern' })).toBeVisible();
	const code = (await page.locator('.brief-code').textContent())!.trim();
	expect(code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]+$/);
	// Der Fokus springt zur Druckansicht, nicht ins Leere.
	await expect(page.getByRole('button', { name: '‹ Zurück' })).toBeFocused();
	await pruefeBildschirm(page, info, 'briefe-druckansicht');
	await bild(page, projekt, 'briefe-druckansicht', true);

	// Das Mitglied meldet sich mit dem Code aus dem Brief an.
	const andere = await page.context().browser()!.newContext(info.project.use);
	const seite2 = await andere.newPage();
	await seite2.goto('/login');
	await seite2.getByLabel('Code aus dem Brief').fill(code);
	await seite2.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(seite2.getByRole('heading', { level: 1, name: 'Hoi Berta' })).toBeVisible();
	await andere.close();

	// Zurück zur Liste: Wer MyTCO geöffnet hat, steht nicht mehr darin.
	await page.getByRole('button', { name: '‹ Zurück' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Briefe' })).toBeVisible();
	await expect(page.getByRole('heading', { level: 1, name: 'Briefe' })).toBeFocused();
	await expect(zeile(page, name)).toHaveCount(0);

	await page.goto(`/verwaltung/mitglieder/${ziel.mitgliedId}`);
	const verlauf = page.getByRole('table', { name: 'Verlauf' });
	await expect(verlauf.getByText('Brief-Code ausgestellt')).toHaveCount(1);
	expect(ohneScreenshotStil(fehler)).toEqual([]);
});

test('RR-04: Druckansicht hinterlässt den Code nirgends', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const nachname = eindeutig('Spur', info);
	await legeKontoAn('Carla', nachname);
	await meldeAdminAn(page);
	await oeffneBriefe(page);
	await erzeugeBriefFuer(page, `${nachname}, Carla`, 'Carla');

	const code = (await page.locator('.brief-code').textContent())!.trim();
	const ohneStrich = code.replace('-', '');
	// SvelteKit selbst legt beim Neuladen Scroll- und Snapshot-Stände in sessionStorage ab; darin
	// (und im Verlauf des Browsers) darf der Code nicht stehen. localStorage bleibt leer.
	const spuren = await page.evaluate(() => {
		const eintraege = (s: Storage) =>
			Array.from({ length: s.length }, (_, i) => `${s.key(i)}=${s.getItem(s.key(i)!)}`);
		return {
			local: localStorage.length,
			text: [...eintraege(sessionStorage), JSON.stringify(history.state)].join('\n')
		};
	});
	expect(spuren.local).toBe(0);
	expect(spuren.text).not.toContain(code);
	expect(spuren.text).not.toContain(ohneStrich);
	expect(page.url()).not.toContain(code);
	expect(page.url()).not.toContain(ohneStrich);
	await pruefeBildschirm(page, info, 'briefe-spur-druckansicht');

	await page.getByRole('button', { name: '‹ Zurück' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Briefe' })).toBeVisible();
	await expect(page.locator('.brief-code')).toHaveCount(0);
	expect(await page.content()).not.toContain(ohneStrich);
	await pruefeBildschirm(page, info, 'briefe-spur-liste');
	expect(ohneScreenshotStil(fehler)).toEqual([]);
});

test('A-LOGIN-01: Adressfenster im Ausdruck wie im Musterbrief', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const projekt = info.project.name;
	const nachname = eindeutig('Fenster', info);
	await legeKontoAn('Doris', nachname);
	await meldeAdminAn(page);
	await oeffneBriefe(page);
	await erzeugeBriefFuer(page, `${nachname}, Doris`, 'Doris');
	await pruefeBildschirm(page, info, 'briefe-fenster-druckansicht');

	await page.emulateMedia({ media: 'print' });
	await expect(
		page.getByRole('button', { name: 'Drucken oder als PDF speichern' })
	).not.toBeVisible();
	await expect(page.locator('.seitenleiste')).not.toBeVisible();
	// Lage im Dokument (nicht im Bildausschnitt): Auf dem schmalen Handy ragt das Blatt seitlich
	// hinaus, der Ausschnitt kann verschoben sein.
	const lage = (seite: Page) =>
		seite.evaluate(() => {
			const imDokument = (wahl: string) => {
				const r = document.querySelector(wahl)!.getBoundingClientRect();
				return { x: r.left + window.scrollX, y: r.top + window.scrollY };
			};
			const brief = imDokument('.brief');
			const fenster = imDokument('.brief-fenster');
			return { brief, x: fenster.x - brief.x, y: fenster.y - brief.y };
		});
	const app = await lage(page);
	await bild(page, projekt, 'briefe-druck', true);

	const muster = await page.context().newPage();
	await muster.emulateMedia({ media: 'print' });
	const stile = `${readFileSync('src/lib/design/tokens.css', 'utf-8')}\n${readFileSync('src/lib/design/brief.css', 'utf-8')}`;
	await muster.setContent(
		baueBriefHtml(
			{
				vorname: 'Doris',
				nachname,
				strasse: 'Erfundenweg 1',
				plz: '4600',
				ort: 'Olten',
				code: erzeugeBriefCode(),
				gueltigBis: new Date(Date.now() + BRIEF_CODE_GUELTIG_MS),
				adresse: 'https://my.example.org',
				kontakt: 'das Sekretariat (erfunden), sekretariat@example.org'
			},
			stile
		)
	);
	const vorlage = await lage(muster);
	await muster.close();

	expect(app.brief.x).toBeCloseTo(0, 0);
	expect(app.brief.y).toBeCloseTo(0, 0);
	expect(Math.abs(app.x - vorlage.x)).toBeLessThanOrEqual(1);
	expect(Math.abs(app.y - vorlage.y)).toBeLessThanOrEqual(1);
	expect(ohneScreenshotStil(fehler)).toEqual([]);
});

test('A-LOGIN-01: Adresse fehlt – Zeile nicht wählbar', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const projekt = info.project.name;
	const ohne = eindeutig('Ohneadresse', info);
	const spaeter = eindeutig('Spaeter', info);
	const ohneKonto = await legeKontoAn('Elsa', ohne);
	await leereStrasse(ohneKonto.mitgliedId);
	const spaeterKonto = await legeKontoAn('Fritz', spaeter);
	await meldeAdminAn(page);
	await oeffneBriefe(page);

	const z = zeile(page, `${ohne}, Elsa`);
	await expect(z).toContainText('Adresse fehlt');
	await expect(z.getByRole('checkbox')).toBeDisabled();
	await pruefeBildschirm(page, info, 'briefe-adresse-fehlt');
	await bild(z, projekt, 'briefe-adresse-fehlt');

	// Fehlt die Adresse erst nach dem Laden, stellt der Server keinen Code aus (409).
	await zeile(page, `${spaeter}, Fritz`).getByRole('checkbox').check();
	await leereStrasse(spaeterKonto.mitgliedId);
	await page.getByRole('button', { name: 'Briefe erzeugen (1)' }).click();
	await page
		.getByRole('dialog', { name: '1 Brief erzeugen?' })
		.getByRole('button', { name: 'Briefe erzeugen', exact: true })
		.click();
	await expect(page.getByRole('alert')).toHaveText(
		'Nicht alle ausgewählten Mitglieder können einen Brief erhalten (inzwischen ausgetreten, gesperrt oder ohne Adresse). Es wurde kein Code ausgestellt.'
	);
	await expect(zeile(page, `${spaeter}, Fritz`)).toContainText('Adresse fehlt');
	await expect(page.getByRole('button', { name: 'Briefe erzeugen (0)' })).toBeDisabled();
	await expect(page.locator('.brief')).toHaveCount(0);
	await pruefeBildschirm(page, info, 'briefe-nicht-moeglich');
	expect(ohneScreenshotStil(fehler)).toEqual([]);
});

test('A-LOGIN-01, RR-07: MyTCO-Admin sieht die Liste ohne Auswahl und ohne Taste', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const nachname = eindeutig('Ansehen', info);
	await legeKontoAn('Gina', nachname);
	await meldeAdminAn(page, true);
	await oeffneBriefe(page);

	await expect(page.getByText('Nur ansehen.')).toBeVisible();
	await expect(zeile(page, `${nachname}, Gina`)).toContainText('noch kein Brief');
	await expect(page.getByRole('checkbox')).toHaveCount(0);
	await expect(page.getByRole('button', { name: /Briefe erzeugen/ })).toHaveCount(0);
	await expect(page.locator('dialog', { hasText: 'Briefe erzeugen' })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'briefe-nur-ansehen');
	expect(ohneScreenshotStil(fehler)).toEqual([]);
});

// Einzelner Brief auf der Seite eines Mitglieds (Karte «Login»).

async function oeffneMitglied(page: Page, mitgliedId: number, name: string) {
	await page.goto(`/verwaltung/mitglieder/${mitgliedId}`);
	await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

const login = (page: Page) =>
	page.locator('details.klappe', { has: page.locator('summary', { hasText: 'Login' }) });

test('A-LOGIN-01, RR-04: einzelner Brief auf der Mitgliedsseite ersetzt den alten Code', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const projekt = info.project.name;
	const nachname = eindeutig('Einzel', info);
	const ziel = await legeKontoMitBriefCodeAn('Hanna', nachname);
	await meldeAdminAn(page);
	await oeffneMitglied(page, ziel.mitgliedId, `${nachname}, Hanna`);

	// Ungespeicherte Angaben: erst speichern, sonst ginge der Brief an die alte Adresse.
	const ausstellen = login(page).getByRole('button', { name: 'Neuen Brief-Code ausstellen' });
	const strasse = page.getByLabel('Strasse', { exact: true });
	const alteStrasse = await strasse.inputValue();
	await strasse.fill(`${alteStrasse} 2`);
	await expect(ausstellen).toBeDisabled();
	await expect(login(page).getByText('Speichere zuerst die Angaben.')).toBeVisible();
	await strasse.fill(alteStrasse);
	await expect(ausstellen).toBeEnabled();
	await expect(login(page).getByText('Speichere zuerst die Angaben.')).toHaveCount(0);

	await ausstellen.click();
	const frage = page.getByRole('dialog', { name: 'Neuen Brief-Code ausstellen?' });
	await expect(frage).toBeVisible();
	await expect(frage).toContainText(
		'Der alte Brief-Code gilt dann nicht mehr. Eingeloggte Geräte bleiben eingeloggt.'
	);
	await pruefeBildschirm(page, info, 'brief-einzeln-rueckfrage');
	await bild(page, projekt, 'brief-einzeln-rueckfrage');
	await frage.getByRole('button', { name: 'Ausstellen', exact: true }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Hanna' })).toBeVisible();
	await expect(page.locator('.brief')).toHaveCount(1);
	const zurueck = page.getByRole('button', { name: '‹ Zurück' });
	await expect(zurueck).toBeFocused();
	const code = (await page.locator('.brief-code').textContent())!.trim();
	expect(code).not.toBe(formatiereBriefCode(ziel.code));
	await pruefeBildschirm(page, info, 'brief-einzeln-druckansicht');
	await bild(page, projekt, 'brief-einzeln-druckansicht', true);

	// Zurück zum Mitglied: Der Code ist weg, die Karte zeigt den neuen Stand.
	await zurueck.click();
	const titel = page.getByRole('heading', { level: 1, name: `${nachname}, Hanna` });
	await expect(titel).toBeVisible();
	await expect(titel).toBeFocused();
	await expect(page.locator('.brief-code')).toHaveCount(0);
	await expect(login(page)).toContainText(/Brief-Code gültig bis \d{2}\.\d{2}\.\d{4}/);
	await expect(page.getByRole('table', { name: 'Verlauf' })).toContainText(
		'Brief-Code ausgestellt'
	);

	// Der alte Code meldet nicht mehr an, der neue schon.
	const andere = await page.context().browser()!.newContext(info.project.use);
	const seite2 = await andere.newPage();
	await seite2.goto('/login');
	await seite2.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(ziel.code));
	await seite2.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(
		seite2.getByText(
			'Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen per E-Mail schicken.'
		)
	).toBeVisible();
	await seite2.getByLabel('Code aus dem Brief').fill(code);
	await seite2.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(seite2.getByRole('heading', { level: 1, name: 'Hoi Hanna' })).toBeVisible();
	await andere.close();
	expect(ohneScreenshotStil(fehler)).toEqual([]);
});

test('A-LOGIN-01: Mitgliedsseite – Adresse fehlt, kein Brief möglich', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const nachname = eindeutig('Ohnebrief', info);
	const ziel = await legeKontoAn('Ines', nachname);
	await meldeAdminAn(page);
	await oeffneMitglied(page, ziel.mitgliedId, `${nachname}, Ines`);

	// Fehlt die Adresse erst nach dem Laden, stellt der Server keinen Code aus (409).
	await leereStrasse(ziel.mitgliedId);
	await login(page).getByRole('button', { name: 'Neuen Brief-Code ausstellen' }).click();
	await page
		.getByRole('dialog', { name: 'Neuen Brief-Code ausstellen?' })
		.getByRole('button', { name: 'Ausstellen', exact: true })
		.click();
	await expect(login(page).getByRole('alert')).toHaveText(
		'Für dieses Mitglied lässt sich kein Brief erstellen.'
	);
	await expect(page.locator('.brief')).toHaveCount(0);
	// Nach dem Neuladen steht statt der Taste der Hinweis.
	await expect(login(page).getByText('Für einen Brief fehlt die Adresse.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Neuen Brief-Code ausstellen' })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'brief-einzeln-adresse-fehlt');
	expect(ohneScreenshotStil(fehler)).toEqual([]);
});

test('RR-07: MyTCO-Admin sieht keine Taste «Neuen Brief-Code ausstellen»', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const nachname = eindeutig('Nurlesen', info);
	const ziel = await legeKontoAn('Jana', nachname);
	await meldeAdminAn(page, true);
	await oeffneMitglied(page, ziel.mitgliedId, `${nachname}, Jana`);

	await expect(login(page)).toContainText('Für dieses Mitglied gibt es noch keinen Brief-Code.');
	await expect(page.getByRole('button', { name: 'Neuen Brief-Code ausstellen' })).toHaveCount(0);
	await expect(page.locator('dialog', { hasText: 'Neuen Brief-Code ausstellen?' })).toHaveCount(0);
	expect(ohneScreenshotStil(fehler)).toEqual([]);
});
