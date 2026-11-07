import { error, redirect } from '@sveltejs/kit';
import {
	ladeAnmeldungen,
	ladeKategorie,
	ladeTurnier,
	type AnmeldungZeile
} from '../../../../../../lib/verwaltung/api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Eine Kategorie gibt es nur unter ihrem eigenen Turnier.
export const load: PageLoad = async ({ fetch, params }) => {
	const kid = Number(params.kid);
	// A-ANMELDUNG-06: Anmeldungen und die übrigen Kategorien (zum Verschieben) laden mit.
	const [a, liste, t] = await Promise.all([
		ladeKategorie(kid, fetch),
		ladeAnmeldungen(kid, fetch),
		ladeTurnier(Number(params.id), fetch)
	]);
	if (a.art === 'ok' && a.daten.turnierId === Number(params.id)) {
		return {
			kategorie: a.daten,
			// `null`: Die Liste liess sich nicht laden; die Seite sagt es in der Karte.
			anmeldungen: liste.art === 'ok' ? liste.daten : (null as AnmeldungZeile[] | null),
			// `null`: Das Turnier liess sich nicht laden; die Karte sagt es, statt falsch zu wirken.
			turnier:
				t.art === 'ok'
					? {
							// FR-46: verschoben wird nur in eine andere aktive Einzel-Kategorie desselben Turniers.
							andere: t.daten.kategorien
								.filter((k) => k.art === 'einzel' && k.status === 'aktiv' && k.id !== kid)
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
