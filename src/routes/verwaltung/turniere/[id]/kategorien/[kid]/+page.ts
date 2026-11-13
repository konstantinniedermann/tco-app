import { error, redirect } from '@sveltejs/kit';
import {
	ladeAnmeldungen,
	ladeDoppel,
	ladeKategorie,
	ladeTurnier,
	type AnmeldungZeile,
	type DoppelVerwaltung
} from '../../../../../../lib/verwaltung/turnier-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Eine Kategorie gibt es nur unter ihrem eigenen Turnier.
export const load: PageLoad = async ({ fetch, params }) => {
	const kid = Number(params.kid);
	// Das Turnier lädt mit der Kategorie; welche Liste dazugehört, sagt erst deren Art.
	const turnierLaden = ladeTurnier(Number(params.id), fetch);
	const a = await ladeKategorie(kid, fetch);
	if (a.art === 'ok' && a.daten.turnierId === Number(params.id)) {
		const art = a.daten.art;
		// A-ANMELDUNG-06: Anmeldungen (Einzel) bzw. Paare, Suchende und Anfragen (Doppel) und die
		// übrigen Kategorien derselben Art (zum Verschieben) laden mit.
		const [einzel, doppel, t] = await Promise.all([
			art === 'einzel' ? ladeAnmeldungen(kid, fetch) : null,
			art === 'doppel' ? ladeDoppel(kid, fetch) : null,
			turnierLaden
		]);
		return {
			kategorie: a.daten,
			// `null`: Die Liste liess sich nicht laden; die Seite sagt es in der Karte.
			anmeldungen: einzel?.art === 'ok' ? einzel.daten : (null as AnmeldungZeile[] | null),
			doppel: doppel?.art === 'ok' ? doppel.daten : (null as DoppelVerwaltung | null),
			// `null`: Das Turnier liess sich nicht laden; die Karte sagt es, statt falsch zu wirken.
			turnier:
				t.art === 'ok'
					? {
							// FR-46: verschoben wird nur in eine andere aktive Kategorie derselben Art desselben
							// Turniers.
							andere: t.daten.kategorien
								.filter((k) => k.art === art && k.status === 'aktiv' && k.id !== kid)
								.map((k) => ({ id: k.id, name: k.name })),
							// Von Hand anmelden und verschieben gehen erst, wenn das Turnier nicht mehr in
							// Vorbereitung ist.
							vorbereitung: t.daten.status === 'vorbereitung'
						}
					: null
		};
	}
	if (a.art === 'abgemeldet') redirect(307, '/login');
	if (a.art === 'kein-admin') redirect(307, '/');
	if (a.art === 'unbestaetigt') redirect(307, '/verwaltung/bestaetigen');
	if (a.art === 'ok' || a.art === 'nicht-gefunden') error(404, 'Diese Kategorie gibt es nicht.');
	error(503, 'Die Kategorie lässt sich gerade nicht laden.');
};
