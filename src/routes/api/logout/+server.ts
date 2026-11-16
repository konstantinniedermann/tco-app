import { holeLoginDienst } from '../../../lib/server/dienste.ts';
import { postLogout } from '../../../lib/server/login/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postLogout(holeLoginDienst(), e);
