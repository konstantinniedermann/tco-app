import { holeAnlassDienste } from '../../../../lib/server/dienste.ts';
import { getKalender } from '../../../../lib/server/anlass/schnittstellen.ts';
import type { RequestHandler } from './$types';

// Ohne Login (SI-19): Die App vom Startbildschirm gibt ihre Anmeldung nicht an die Ansicht
// weiter, die die Kalenderdatei öffnet.
export const GET: RequestHandler = (e) => getKalender(holeAnlassDienste(), e);
