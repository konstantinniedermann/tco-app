import { holeMitteilungAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { postZustand } from '../../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postZustand(holeMitteilungAdminDienste(), e);
