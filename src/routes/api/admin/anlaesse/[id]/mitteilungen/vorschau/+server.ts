import { holeMitteilungAdminDienste } from '../../../../../../../lib/server/dienste.ts';
import { postAnlassVorschau } from '../../../../../../../lib/server/mitteilung/verwaltung-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAnlassVorschau(holeMitteilungAdminDienste(), e);
