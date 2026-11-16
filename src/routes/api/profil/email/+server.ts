import { holeProfilDienste } from '../../../../lib/server/dienste.ts';
import { postEmail } from '../../../../lib/server/profil/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postEmail(holeProfilDienste(), e);
