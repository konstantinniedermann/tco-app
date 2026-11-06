import { holeAdminDienste } from '../../../../../../lib/server/admin/index.ts';
import { postTurnierStatus } from '../../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postTurnierStatus(holeAdminDienste(), e);
