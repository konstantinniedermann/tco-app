import { holeDb } from '../../../lib/server/db/index.ts';
import { getSitzung } from '../../../lib/server/login/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getSitzung(e, holeDb());
