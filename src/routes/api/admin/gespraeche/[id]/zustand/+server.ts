import { holeMitteilungAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { postZustand } from '../../../../../../lib/server/gespraech/verwaltung-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postZustand(holeMitteilungAdminDienste(), e);
