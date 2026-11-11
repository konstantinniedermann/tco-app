import { holeMitteilungAdminDienste } from '../../../../../lib/server/dienste.ts';
import { postVereinVorschau } from '../../../../../lib/server/mitteilung/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postVereinVorschau(holeMitteilungAdminDienste(), e);
