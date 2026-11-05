import { holeProfilDienste } from '../../../../../lib/server/profil/index.ts';
import { postEmailBestaetigen } from '../../../../../lib/server/profil/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postEmailBestaetigen(holeProfilDienste(), e);
