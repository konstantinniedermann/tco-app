import { holeCmDienste } from '../../../../../../lib/server/dienste.ts';
import { postCmWildcard } from '../../../../../../lib/server/cm/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postCmWildcard(holeCmDienste(), e);
