import { holeAnlassDienste } from '../../../lib/server/anlass/index.ts';
import { getAnlaesse } from '../../../lib/server/anlass/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getAnlaesse(holeAnlassDienste(), e);
