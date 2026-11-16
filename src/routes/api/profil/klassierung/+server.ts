import { holeProfilDienste } from '../../../../lib/server/dienste.ts';
import { postKlassierung } from '../../../../lib/server/profil/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postKlassierung(holeProfilDienste(), e);
