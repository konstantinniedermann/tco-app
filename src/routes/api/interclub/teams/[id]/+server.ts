import { holeInterclubDienste } from '../../../../../lib/server/dienste.ts';
import { getInterclubTeam } from '../../../../../lib/server/interclub/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getInterclubTeam(holeInterclubDienste(), e);
