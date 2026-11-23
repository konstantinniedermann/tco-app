import { holeInterclubDienste } from '../../../../../../lib/server/dienste.ts';
import { postInterclubFolgen } from '../../../../../../lib/server/interclub/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postInterclubFolgen(holeInterclubDienste(), e);
