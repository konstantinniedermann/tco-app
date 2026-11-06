import { holeMitteilungAdminDienste } from '../../../../../lib/server/mitteilung/index.ts';
import { postVereinVorschau } from '../../../../../lib/server/mitteilung/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postVereinVorschau(holeMitteilungAdminDienste(), e);
