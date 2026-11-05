import roh from '../../../docs/datenschutzerklaerung.md?raw';
import { leseErklaerung } from '../../lib/datenschutz/erklaerung.ts';
import type { PageLoad } from './$types';

// Ohne Login erreichbar (DS-09). Der Text kommt beim Bauen aus der Doku.
export const load: PageLoad = () => leseErklaerung(roh);
