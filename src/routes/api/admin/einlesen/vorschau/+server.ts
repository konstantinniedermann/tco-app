import { holeAdminDienste } from '../../../../../lib/server/dienste.ts';
import { postEinlesenVorschau } from '../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postEinlesenVorschau(holeAdminDienste(), e);
