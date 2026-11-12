import { holeCmDienste } from '../../../lib/server/dienste.ts';
import { getCmTurniere } from '../../../lib/server/cm/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getCmTurniere(holeCmDienste(), e);
