import { holeMitteilungAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { getGespraeche } from '../../../../../../lib/server/gespraech/verwaltung-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getGespraeche(holeMitteilungAdminDienste(), e);
