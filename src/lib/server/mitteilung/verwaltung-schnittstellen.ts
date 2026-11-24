// Schnittstellen der Verwaltung zu Mitteilungen (FR-42 bis FR-45): Verlauf, Vorschau und Versand,
// zu einem Anlass, an den Verein (Bereich `mitglieder`) oder zu einem Turnier (Bereich `cm`); Rechte
// über `liest` und `schreibt`. Nur Routen unter `src/routes/api/admin/` nutzen diese Datei
// (Bauregel, Schutz am Pfad); die Schnittstellen der Mitglieder stehen in `schnittstellen.ts`.
import {
	ANLASS_AUSWAHLEN,
	TURNIER_AUSWAHLEN,
	VEREIN_AUSWAHLEN,
	type AnlassAuswahl,
	type TurnierAuswahl,
	type VereinAuswahl
} from '../../mitteilung/auswahl.ts';
import { FELD_MELDUNG, vorlagenAnlass, vorlagenTurnier } from '../../mitteilung/vorlagen.ts';
import type { Bereich } from '../../verwaltung/bereiche.ts';
import { liest, schreibt, type AdminEreignis } from '../admin/rechte.ts';
import { antwort, jetzt, nichtGefunden } from '../http.ts';
import { parseId } from '../parse-id.ts';
import {
	pruefeKategorie,
	pruefeMitteilung,
	type MitteilungFeld,
	type MitteilungWerte
} from './angaben.ts';
import {
	anlassEmpfaenger,
	turnierEmpfaenger,
	vereinEmpfaenger,
	type Empfaenger
} from './empfaenger.ts';
import {
	ladeAnlassKopf,
	ladeTurnierKopf,
	ladeVerlauf,
	speichereMitteilung,
	type Bezug
} from './verlauf.ts';
import type { MitteilungAdminDienste } from './typen.ts';
import { versende, vorschau } from './versand.ts';

type AdminHandler = (d: MitteilungAdminDienste, e: AdminEreignis) => Promise<Response>;

/** Worauf sich die Anfrage bezieht, nach der Prüfung der Rechte aufgelöst. */
type Ziel =
	| { art: 'verein' }
	| { art: 'anlass'; anlass: NonNullable<Awaited<ReturnType<typeof ladeAnlassKopf>>> }
	| { art: 'turnier'; turnier: NonNullable<Awaited<ReturnType<typeof ladeTurnierKopf>>> };

/** Spec A1: Zum Turnier sendet der CM-Admin, sonst der Mitglieder-Admin. */
const bereich = (art: Ziel['art']): Bereich => (art === 'turnier' ? 'cm' : 'mitglieder');

const bezug = (z: Ziel): Bezug =>
	z.art === 'anlass'
		? { art: 'anlass', anlassId: z.anlass.id }
		: z.art === 'turnier'
			? { art: 'turnier', turnierId: z.turnier.id }
			: { art: 'verein' };

/** Unbekannter oder ungültiger Anlass oder Turnier → 404; beim Verein gibt es immer ein Ziel. */
async function mitZiel(
	d: MitteilungAdminDienste,
	e: AdminEreignis,
	art: Ziel['art'],
	fn: (z: Ziel) => Promise<Response>
): Promise<Response> {
	if (art === 'verein') return fn({ art });
	const id = parseId(e.params.id);
	if (id === null) return nichtGefunden();
	if (art === 'turnier') {
		const t = await ladeTurnierKopf(d.db, id);
		return t ? fn({ art, turnier: t }) : nichtGefunden();
	}
	const a = await ladeAnlassKopf(d.db, id);
	return a ? fn({ art, anlass: a }) : nichtGefunden();
}

/** Vorlagen je Ziel; beim Verein keine. */
const vorlagen = (z: Ziel) =>
	z.art === 'anlass'
		? vorlagenAnlass(z.anlass)
		: z.art === 'turnier'
			? vorlagenTurnier(z.turnier)
			: [];

function verlauf(art: Ziel['art']): AdminHandler {
	return (d, e) =>
		liest(d, e, bereich(art), () =>
			mitZiel(d, e, art, async (z) => {
				const inhalt = {
					vorlagen: vorlagen(z),
					verlauf: await ladeVerlauf(d.db, bezug(z), jetzt(d))
				};
				// Spec A6: Zum Turnier wählt das Formular aus den aktiven Kategorien.
				return antwort(
					200,
					z.art === 'turnier' ? { ...inhalt, kategorien: z.turnier.kategorien } : inhalt
				);
			})
		);
}

type Versand = {
	d: MitteilungAdminDienste;
	ziel: Ziel;
	werte: MitteilungWerte;
	/** Spec A7: Kategorie einer Mitteilung zum Turnier; sonst `null`. */
	kategorie: { id: number; name: string } | null;
	empf: Empfaenger[];
	absenderId: number;
};

type Gepruefte =
	| { ok: true; werte: MitteilungWerte; kategorie: { id: number; name: string } | null }
	| { ok: false; felder: MitteilungFeld[] };

/** Prüft die Angaben gegen die Auswahlen des Ziels; zum Turnier auch die Kategorie (Spec A6). */
function pruefe(ziel: Ziel, koerper: Record<string, unknown>): Gepruefte {
	const auswahlen =
		ziel.art === 'anlass'
			? ANLASS_AUSWAHLEN
			: ziel.art === 'turnier'
				? TURNIER_AUSWAHLEN
				: VEREIN_AUSWAHLEN;
	const p = pruefeMitteilung(koerper, auswahlen);
	const felder: MitteilungFeld[] = p.ok ? [] : [...p.felder];
	let kategorie: { id: number; name: string } | null = null;
	// Die Kategorie lässt sich nur zu einer gültigen Auswahl prüfen.
	if (ziel.art === 'turnier' && !felder.includes('auswahl')) {
		const k = pruefeKategorie(koerper, koerper.auswahl as TurnierAuswahl, ziel.turnier.kategorien);
		if (k.ok) kategorie = k.kategorie;
		else felder.push('kategorie');
	}
	if (!p.ok || felder.length > 0) return { ok: false, felder };
	return { ok: true, werte: p.werte, kategorie };
}

/** Sucht die Empfänger nach der geprüften Auswahl des Ziels. */
function empfaengerFuer(
	d: MitteilungAdminDienste,
	ziel: Ziel,
	werte: MitteilungWerte,
	kategorie: { id: number } | null
): Promise<Empfaenger[]> {
	// Die Auswahl ist gegen die Liste des Ziels geprüft.
	switch (ziel.art) {
		case 'anlass':
			return anlassEmpfaenger(d.db, ziel.anlass.id, werte.auswahl as AnlassAuswahl, jetzt(d));
		case 'turnier':
			return turnierEmpfaenger(
				d.db,
				ziel.turnier.id,
				werte.auswahl as TurnierAuswahl,
				kategorie?.id ?? null
			);
		case 'verein':
			return vereinEmpfaenger(d.db, werte.auswahl as VereinAuswahl);
	}
}

/**
 * Spec A2: Zu einem Turnier in Vorbereitung (gespeicherter Status) geht nichts hinaus, 409; danach
 * prüft es die Angaben (400 mit einem Satz je Feld) und sucht die Empfänger nach der Auswahl.
 */
function mitEmpfaengern(art: Ziel['art'], fn: (v: Versand) => Promise<Response>): AdminHandler {
	return (d, e) =>
		schreibt(d, e, bereich(art), (urheber, koerper) =>
			mitZiel(d, e, art, async (ziel) => {
				if (ziel.art === 'turnier' && ziel.turnier.status === 'vorbereitung') {
					return antwort(409, { fehler: 'vorbereitung' });
				}
				const p = pruefe(ziel, koerper);
				if (!p.ok) {
					const felder = Object.fromEntries(p.felder.map((f) => [f, FELD_MELDUNG[f]]));
					return antwort(400, { fehler: 'eingabe', felder });
				}
				const empf = await empfaengerFuer(d, ziel, p.werte, p.kategorie);
				return fn({
					d,
					ziel,
					werte: p.werte,
					kategorie: p.kategorie,
					empf,
					absenderId: urheber.mitgliedId
				});
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

/** Spec A4: Link auf den Anlass, die Seite des Turniers für Mitglieder, sonst die Startseite. */
function linkFuer(adresse: string, z: Ziel): string {
	const basis = adresse.replace(/\/+$/, '');
	if (z.art === 'anlass') return `${basis}/anlass/${z.anlass.id}`;
	if (z.art === 'turnier') return `${basis}/clubmeisterschaft/${z.turnier.id}`;
	return `${basis}/`;
}

/** FR-44, FR-45: schickt die Mitteilung und schreibt die Zahlen in den Verlauf. */
function sendenFuer(art: Ziel['art']): AdminHandler {
	return mitEmpfaengern(art, async ({ d, ziel, werte, kategorie, empf, absenderId }) => {
		const z = await versende(
			{ push: d.push, mailer: d.mailer, db: d.db, adresse: d.adresse },
			empf,
			{ titel: werte.titel, text: werte.text, link: linkFuer(d.adresse, ziel), weg: werte.weg }
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
				// Spec A7: als Text, damit der Verlauf auch nach einer Umbenennung stimmt.
				kategorie: kategorie?.name ?? null,
				weg: werte.weg
			},
			jetzt(d)
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
export const getTurnierMitteilungen = verlauf('turnier');
export const postTurnierVorschau = vorschauFuer('turnier');
export const postTurnierSenden = sendenFuer('turnier');

export const MITTEILUNG_ADMIN_SCHNITTSTELLEN = {
	getVereinMitteilungen,
	postVereinVorschau,
	postVereinSenden,
	getAnlassMitteilungen,
	postAnlassVorschau,
	postAnlassSenden,
	getTurnierMitteilungen,
	postTurnierVorschau,
	postTurnierSenden
} satisfies Record<string, AdminHandler>;
