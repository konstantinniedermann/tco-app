import { holeProfilDienste } from '../../../lib/server/dienste.ts';
import { getProfil, postProfil } from '../../../lib/server/profil/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getProfil(holeProfilDienste(), e);
export const POST: RequestHandler = (e) => postProfil(holeProfilDienste(), e);
