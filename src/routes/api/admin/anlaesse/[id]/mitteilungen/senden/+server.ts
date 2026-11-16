import { holeMitteilungAdminDienste } from '../../../../../../../lib/server/dienste.ts';
import { postAnlassSenden } from '../../../../../../../lib/server/mitteilung/verwaltung-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAnlassSenden(holeMitteilungAdminDienste(), e);
