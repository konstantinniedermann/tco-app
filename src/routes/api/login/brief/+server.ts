import { holeLoginDienst } from '../../../../lib/server/login/index.ts';
import { postBrief } from '../../../../lib/server/login/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postBrief(holeLoginDienst(), e);
