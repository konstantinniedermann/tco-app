import roh from '../../../docs/datenschutzerklaerung.md?raw';
import { leseErklaerung } from '../../lib/datenschutz/erklaerung.ts';
import { hatSitzung } from '../../lib/login/sitzung.ts';
import type { PageLoad } from './$types';

// Ohne Login erreichbar (DS-09). Der Text kommt beim Bauen aus der Doku. `angemeldet`: Reiter
// und Zurück-Link (feste Ordnung).
export const load: PageLoad = async ({ fetch }) => ({
	...leseErklaerung(roh),
	angemeldet: await hatSitzung(fetch)
});
