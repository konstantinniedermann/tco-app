import { holeMitteilungAdminDienste } from '../../../../../lib/server/dienste.ts';
import { postRolleVergeben } from '../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postRolleVergeben(holeMitteilungAdminDienste(), e);
