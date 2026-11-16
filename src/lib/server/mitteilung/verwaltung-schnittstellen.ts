// Schnittstellen der Verwaltung zu Mitteilungen (FR-42 bis FR-45): Verlauf, Vorschau und Versand,
// zu einem Anlass oder an den Verein; Rechte über `liest` und `schreibt` (Bereich `mitglieder`).
// Nur Routen unter `src/routes/api/admin/` nutzen diese Datei (Bauregel, Schutz am Pfad); die
// Schnittstellen der Mitglieder stehen in `schnittstellen.ts`.
import {
	ANLASS_AUSWAHLEN,
	VEREIN_AUSWAHLEN,
	type AnlassAuswahl
} from '../../mitteilung/auswahl.ts';
import { FELD_MELDUNG, vorlagenAnlass } from '../../mitteilung/vorlagen.ts';
import { liest, schreibt, type AdminEreignis } from '../admin/rechte.ts';
import { antwort, jetzt, nichtGefunden } from '../http.ts';
import { parseId } from '../parse-id.ts';
import { pruefeMitteilung, type MitteilungWerte } from './angaben.ts';
import { anlassEmpfaenger, vereinEmpfaenger, type Empfaenger } from './empfaenger.ts';
import { ladeAnlassKopf, ladeVerlauf, speichereMitteilung } from './verlauf.ts';
import type { MitteilungAdminDienste } from './typen.ts';
import { versende, vorschau } from './versand.ts';

type AdminHandler = (d: MitteilungAdminDienste, e: AdminEreignis) => Promise<Response>;

/** Worauf sich die Anfrage bezieht, nach der Prüfung der Rechte aufgelöst. */
type Ziel =
	| { art: 'verein' }
	| { art: 'anlass'; anlass: NonNullable<Awaited<ReturnType<typeof ladeAnlassKopf>>> };

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
					verlauf: await ladeVerlauf(d.db, bezug(z), jetzt(d))
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

/** Prüft die Angaben (400 mit einem Satz je Feld) und sucht die Empfänger nach der Auswahl. */
function mitEmpfaengern(art: Ziel['art'], fn: (v: Versand) => Promise<Response>): AdminHandler {
	return (d, e) =>
		schreibt(d, e, 'mitglieder', (urheber, koerper) =>
			mitZiel(d, e, art, async (ziel) => {
				const auswahlen = ziel.art === 'anlass' ? ANLASS_AUSWAHLEN : VEREIN_AUSWAHLEN;
				const p = pruefeMitteilung(koerper, auswahlen);
				if (!p.ok) {
					const felder = Object.fromEntries(p.felder.map((f) => [f, FELD_MELDUNG[f]]));
					return antwort(400, { fehler: 'eingabe', felder });
				}
				const empf =
					ziel.art === 'anlass'
						? await anlassEmpfaenger(
								d.db,
								ziel.anlass.id,
								// Geprüft gegen ANLASS_AUSWAHLEN.
								p.werte.auswahl as AnlassAuswahl,
								jetzt(d)
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

export const MITTEILUNG_ADMIN_SCHNITTSTELLEN = {
	getVereinMitteilungen,
	postVereinVorschau,
	postVereinSenden,
	getAnlassMitteilungen,
	postAnlassVorschau,
	postAnlassSenden
} satisfies Record<string, AdminHandler>;
