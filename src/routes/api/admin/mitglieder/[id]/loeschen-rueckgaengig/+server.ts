import { holeAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { postLoeschenRueckgaengig } from '../../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postLoeschenRueckgaengig(holeAdminDienste(), e);
