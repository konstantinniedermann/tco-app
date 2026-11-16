import { holeProfilDienste } from '../../../../../lib/server/dienste.ts';
import { postEmailBestaetigen } from '../../../../../lib/server/profil/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postEmailBestaetigen(holeProfilDienste(), e);
