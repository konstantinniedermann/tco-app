import { holeLoginDienst } from '../../../../lib/server/dienste.ts';
import { postMailCode } from '../../../../lib/server/login/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postMailCode(holeLoginDienst(), e);
