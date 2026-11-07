import { holeAdminDienste } from '../../../../lib/server/admin/index.ts';
import { postAnsicht } from '../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAnsicht(holeAdminDienste(), e);
