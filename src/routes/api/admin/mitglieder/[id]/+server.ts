import { holeAdminDienste, holeMitteilungAdminDienste } from '../../../../../lib/server/dienste.ts';
import { getMitglied, postMitglied } from '../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getMitglied(holeAdminDienste(), e);
// Mit Push und Mailer: Die Änderung kann dem Mitglied gemeldet werden (FR-56).
export const POST: RequestHandler = (e) => postMitglied(holeMitteilungAdminDienste(), e);
