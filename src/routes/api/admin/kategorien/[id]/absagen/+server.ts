import { holeAdminDienste } from '../../../../../../lib/server/admin/index.ts';
import { postKategorieAbsagen } from '../../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postKategorieAbsagen(holeAdminDienste(), e);
