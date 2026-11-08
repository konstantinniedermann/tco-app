import { holeCmDienste } from '../../../../../../lib/server/cm/index.ts';
import { getCmPartner } from '../../../../../../lib/server/cm/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getCmPartner(holeCmDienste(), e);
