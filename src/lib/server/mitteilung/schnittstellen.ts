// Schnittstellen zu Mitteilungen. Mitglieder (FR-40, FR-41): Themen und Push-Abo dieses Geräts.
// Verwaltung (FR-42 bis FR-45): Verlauf, Vorschau und Versand, zu einem Anlass oder an den Verein.
import {
	ANLASS_AUSWAHLEN,
	VEREIN_AUSWAHLEN,
	type AnlassAuswahl
} from '../../mitteilung/auswahl.ts';
import { vorlagenAnlass } from '../../mitteilung/vorlagen.ts';
import { liest, schreibt, type AdminDienste, type AdminEreignis } from '../admin/schnittstellen.ts';
import type { Db } from '../db/index.ts';
import type { Mailer } from '../login/dienst.ts';
import {
	antwort,
	formatFehler,
	istJson,
	leseKoerper,
	type Ereignis
} from '../login/schnittstellen.ts';
import type { AngemeldetesKonto } from '../login/sitzung.ts';
import { parseId } from '../parse-id.ts';
import { loescheAbo, pruefeAbo, speichereAbo } from './abo.ts';
import { pruefeMitteilung, type MitteilungWerte } from './angaben.ts';
import { anlassEmpfaenger, vereinEmpfaenger, type Empfaenger } from './empfaenger.ts';
import { ladeEinstellungen, pruefeThemen, setzeThemen } from './themen.ts';
import { ladeAnlassKopf, ladeVerlauf, speichereMitteilung } from './verlauf.ts';
import { versende, vorschau, type PushSender } from './versand.ts';

// Für die Mitglieder: ohne Push-Sender und Mailer.
export type MitteilungDienste = { db: Db; vapidOeffentlich: string | null; jetzt?: () => Date };

const jetzt = (d: MitteilungDienste) => (d.jetzt ?? (() => new Date()))();

async function mitSitzung(
	e: Ereignis,
	fn: (konto: AngemeldetesKonto) => Promise<Response>
): Promise<Response> {
	const konto = e.locals.konto;
	if (!konto) return antwort(401, { fehler: 'abgemeldet' });
	return fn(konto);
}

async function stand(d: MitteilungDienste, konto: AngemeldetesKonto) {
	return {
		...(await ladeEinstellungen(d.db, konto.kontoId, konto.sitzungHash)),
		schluessel: d.vapidOeffentlich
	};
}

export function getBenachrichtigungen(d: MitteilungDienste, e: Ereignis): Promise<Response> {
	return mitSitzung(e, async (konto) => antwort(200, await stand(d, konto)));
}

export async function postThemen(d: MitteilungDienste, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitSitzung(e, async (konto) => {
		const themen = pruefeThemen((await leseKoerper(e)).themen);
		if (!themen) return antwort(400, { fehler: 'eingabe' });
		await setzeThemen(d.db, konto.kontoId, themen);
		return antwort(200, await stand(d, konto));
	});
}

export async function postAbo(d: MitteilungDienste, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitSitzung(e, async (konto) => {
		if (d.vapidOeffentlich === null) return antwort(409, { fehler: 'push-aus' });
		const p = pruefeAbo(await leseKoerper(e));
		if (!p.ok) return antwort(400, { fehler: 'eingabe' });
		await speichereAbo(d.db, konto.kontoId, konto.sitzungHash, p.abo, jetzt(d));
		return antwort(200, { pushHier: true });
	});
}

export async function postAboLoeschen(d: MitteilungDienste, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitSitzung(e, async (konto) => {
		await loescheAbo(d.db, konto.sitzungHash);
		return antwort(200, { pushHier: false });
	});
}

// --- Verwaltung -------------------------------------------------------------------------------

/**
 * Die Rechte prüft die Verwaltung (`liest`/`schreibt`, Bereich `mitglieder`): Der Mitglieder-Admin
 * sendet, der MyTCO-Admin liest nur den Verlauf. `push: null` heisst: kein VAPID, Push ist aus.
 * `adresse`: Adresse von MyTCO für die Links.
 */
export type MitteilungAdminDienste = AdminDienste & {
	push: PushSender | null;
	mailer: Mailer;
	adresse: string;
};

type AdminHandler = (d: MitteilungAdminDienste, e: AdminEreignis) => Promise<Response>;

/** Worauf sich die Anfrage bezieht, nach der Prüfung der Rechte aufgelöst. */
type Ziel =
	| { art: 'verein' }
	| { art: 'anlass'; anlass: NonNullable<Awaited<ReturnType<typeof ladeAnlassKopf>>> };

const jetztAdmin = (d: AdminDienste) => (d.jetzt ?? (() => new Date()))();
const nichtGefunden = () => antwort(404, { fehler: 'nicht-gefunden' });
const bezug = (z: Ziel) =>
	z.art === 'anlass'
		? { art: 'anlass' as const, anlassId: z.anlass.id }
		: { art: 'verein' as const };

/** Unbekannter oder ungültiger Anlass → 404; beim Verein gibt es immer ein Ziel. */
async function mitZiel(
	d: MitteilungAdminDienste,
	e: AdminEreignis,
	art: Ziel['art'],
	fn: (z: Ziel) => Promise<Response>
): Promise<Response> {
	if (art === 'verein') return fn({ art });
	const id = parseId(e.params.id);
	const a = id === null ? null : await ladeAnlassKopf(d.db, id);
	return a ? fn({ art, anlass: a }) : nichtGefunden();
}

function verlauf(art: Ziel['art']): AdminHandler {
	return (d, e) =>
		liest(d, e, 'mitglieder', () =>
			mitZiel(d, e, art, async (z) =>
				antwort(200, {
					vorlagen: z.art === 'anlass' ? vorlagenAnlass(z.anlass) : [],
					verlauf: await ladeVerlauf(d.db, bezug(z))
				})
			)
		);
}

type Versand = {
	d: MitteilungAdminDienste;
	ziel: Ziel;
	werte: MitteilungWerte;
	empf: Empfaenger[];
	absenderId: number;
};

/** Prüft die Angaben (400 mit den Feldern) und sucht die Empfänger nach der Auswahl. */
function mitEmpfaengern(art: Ziel['art'], fn: (v: Versand) => Promise<Response>): AdminHandler {
	return (d, e) =>
		schreibt(d, e, 'mitglieder', (urheber, koerper) =>
			mitZiel(d, e, art, async (ziel) => {
				const auswahlen = ziel.art === 'anlass' ? ANLASS_AUSWAHLEN : VEREIN_AUSWAHLEN;
				const p = pruefeMitteilung(koerper, auswahlen);
				if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.felder });
				const empf =
					ziel.art === 'anlass'
						? await anlassEmpfaenger(
								d.db,
								ziel.anlass.id,
								// Geprüft gegen ANLASS_AUSWAHLEN.
								p.werte.auswahl as AnlassAuswahl,
								jetztAdmin(d)
							)
						: await vereinEmpfaenger(d.db);
				return fn({ d, ziel, werte: p.werte, empf, absenderId: urheber.mitgliedId });
			})
		);
}

/** FR-43, FR-44: wer die Mitteilung wie bekäme; schickt nichts. */
function vorschauFuer(art: Ziel['art']): AdminHandler {
	return mitEmpfaengern(art, async ({ d, werte, empf }) => {
		const v = vorschau(empf, werte.weg, d.push !== null);
		return antwort(200, {
			anzahl: v.anzahl,
			push: v.push,
			mails: v.mails,
			nichtErreichbar: v.nichtErreichbar,
			namen: v.namen
		});
	});
}

/** FR-44, FR-45: schickt die Mitteilung und schreibt die Zahlen in den Verlauf. */
function sendenFuer(art: Ziel['art']): AdminHandler {
	return mitEmpfaengern(art, async ({ d, ziel, werte, empf, absenderId }) => {
		const adresse = d.adresse.replace(/\/+$/, '');
		const link = ziel.art === 'anlass' ? `${adresse}/anlass/${ziel.anlass.id}` : `${adresse}/`;
		const z = await versende(
			{ push: d.push, mailer: d.mailer, db: d.db, adresse: d.adresse },
			empf,
			{ titel: werte.titel, text: werte.text, link, weg: werte.weg }
		);
		await speichereMitteilung(
			d.db,
			bezug(ziel),
			{
				...z,
				absenderId,
				titel: werte.titel,
				text: werte.text,
				auswahl: werte.auswahl,
				weg: werte.weg
			},
			jetztAdmin(d)
		);
		return antwort(201, z);
	});
}

export const getVereinMitteilungen = verlauf('verein');
export const postVereinVorschau = vorschauFuer('verein');
export const postVereinSenden = sendenFuer('verein');
export const getAnlassMitteilungen = verlauf('anlass');
export const postAnlassVorschau = vorschauFuer('anlass');
export const postAnlassSenden = sendenFuer('anlass');

export const MITTEILUNG_ADMIN_SCHNITTSTELLEN = {
	getVereinMitteilungen,
	postVereinVorschau,
	postVereinSenden,
	getAnlassMitteilungen,
	postAnlassVorschau,
	postAnlassSenden
} satisfies Record<string, AdminHandler>;
