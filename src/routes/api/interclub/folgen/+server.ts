import { holeInterclubDienste } from '../../../../lib/server/dienste.ts';
import { getInterclubFolgen } from '../../../../lib/server/interclub/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getInterclubFolgen(holeInterclubDienste(), e);
