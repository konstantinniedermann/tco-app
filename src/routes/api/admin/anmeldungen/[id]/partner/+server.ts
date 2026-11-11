import { holeMitteilungAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { postPartnerAendern } from '../../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postPartnerAendern(holeMitteilungAdminDienste(), e);
