import { holeCmDienste } from '../../../../lib/server/cm/index.ts';
import { getCmAnsicht } from '../../../../lib/server/cm/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getCmAnsicht(holeCmDienste(), e);
