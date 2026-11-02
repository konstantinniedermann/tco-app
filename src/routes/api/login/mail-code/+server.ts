import { holeLoginDienst } from '../../../../lib/server/login/index.ts';
import { postMailCode } from '../../../../lib/server/login/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postMailCode(holeLoginDienst(), e);
