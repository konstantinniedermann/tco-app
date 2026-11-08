import { holeCmDienste } from '../../../../../../lib/server/cm/index.ts';
import { postCmAnfrageZurueck } from '../../../../../../lib/server/cm/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postCmAnfrageZurueck(holeCmDienste(), e);
