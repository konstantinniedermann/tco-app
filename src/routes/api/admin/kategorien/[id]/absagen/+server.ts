import { holeMitteilungAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { postKategorieAbsagen } from '../../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postKategorieAbsagen(holeMitteilungAdminDienste(), e);
