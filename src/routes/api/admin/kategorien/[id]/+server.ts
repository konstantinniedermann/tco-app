import { holeAdminDienste } from '../../../../../lib/server/admin/index.ts';
import { getKategorie, postKategorie } from '../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getKategorie(holeAdminDienste(), e);
export const POST: RequestHandler = (e) => postKategorie(holeAdminDienste(), e);
