import { holeInterclubDienste } from '../../../lib/server/dienste.ts';
import { getInterclub } from '../../../lib/server/interclub/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getInterclub(holeInterclubDienste(), e);
