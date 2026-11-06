import { holeMitteilungAdminDienste } from '../../../../../../../lib/server/mitteilung/index.ts';
import { postAnlassSenden } from '../../../../../../../lib/server/mitteilung/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAnlassSenden(holeMitteilungAdminDienste(), e);
