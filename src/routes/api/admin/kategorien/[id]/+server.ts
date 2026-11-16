import { holeAdminDienste, holeMitteilungAdminDienste } from '../../../../../lib/server/dienste.ts';
import { getKategorie, postKategorie } from '../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getKategorie(holeAdminDienste(), e);
export const POST: RequestHandler = (e) => postKategorie(holeMitteilungAdminDienste(), e);
