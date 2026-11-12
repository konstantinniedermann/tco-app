import { holeMitteilungAdminDienste } from '../../../../../lib/server/dienste.ts';
import { postVereinSenden } from '../../../../../lib/server/mitteilung/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postVereinSenden(holeMitteilungAdminDienste(), e);
