import { holeLoginDienst } from '../../../../lib/server/login/index.ts';
import { postMail } from '../../../../lib/server/login/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postMail(holeLoginDienst(), e);
