import { holeInterclubDienste } from '../../../../../../../lib/server/dienste.ts';
import { getInterclubBegegnung } from '../../../../../../../lib/server/interclub/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getInterclubBegegnung(holeInterclubDienste(), e);
