import { holeProfilDienste } from '../../../../lib/server/profil/index.ts';
import { postRufname } from '../../../../lib/server/profil/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postRufname(holeProfilDienste(), e);
