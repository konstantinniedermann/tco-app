import { holeCmDienste } from '../../../../../../lib/server/cm/index.ts';
import { postCmAbmeldung } from '../../../../../../lib/server/cm/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postCmAbmeldung(holeCmDienste(), e);
