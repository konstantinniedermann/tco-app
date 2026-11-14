import type { RequestEvent } from '@sveltejs/kit';
import { ANLASS_SCHNITTSTELLEN } from '../../src/lib/server/anlass/schnittstellen.ts';
import type { AnlassDienste } from '../../src/lib/server/anlass/typen.ts';
import { CM_SCHNITTSTELLEN } from '../../src/lib/server/cm/schnittstellen.ts';
import type { CmDienste } from '../../src/lib/server/cm/typen.ts';
import { GESPRAECH_SCHNITTSTELLEN } from '../../src/lib/server/gespraech/schnittstellen.ts';
import type { Ereignis } from '../../src/lib/server/http.ts';
import { INTERCLUB_SCHNITTSTELLEN } from '../../src/lib/server/interclub/schnittstellen.ts';
import type { InterclubDienste } from '../../src/lib/server/interclub/typen.ts';
import { PASSKEY_SCHNITTSTELLEN } from '../../src/lib/server/login/passkey-schnittstellen.ts';
import type { PasskeyDienst } from '../../src/lib/server/login/passkey.ts';
import { MITTEILUNG_SCHNITTSTELLEN } from '../../src/lib/server/mitteilung/schnittstellen.ts';
import type { MitteilungDienste } from '../../src/lib/server/mitteilung/typen.ts';
import { PROFIL_SCHNITTSTELLEN } from '../../src/lib/server/profil/schnittstellen.ts';
import type { ProfilDienste } from '../../src/lib/server/profil/typen.ts';

/** Die Dienste, die jede Liste der Mitglieder bekommt; Schlüssel wie in `MITGLIEDER_LISTEN`. */
export type MitgliederDienste = {
	cm: CmDienste;
	anlass: AnlassDienste;
	interclub: InterclubDienste;
	profil: ProfilDienste;
	gespraech: CmDienste;
	passkey: PasskeyDienst;
	mitteilung: MitteilungDienste;
};

/** Eine Schnittstelle der Mitglieder mit den Diensten ihrer Liste. */
export type MitgliederSchnittstelle<K extends keyof MitgliederDienste> = (
	d: MitgliederDienste[K],
	e: Ereignis & Pick<RequestEvent, 'params'>
) => Promise<Response>;

/**
 * Die Listen der Mitglieder, an einer Stelle für die Tests (wie `verwaltungs-listen.ts`):
 * Grundprüfung (401, 415) und Routen-Test nehmen sie von hier. Eine neue Liste kommt hier hinein,
 * ihre Dienste in `MitgliederDienste`. Fehlt sie hier, wird der Routen-Test rot, sobald eine
 * Route der Mitglieder eine ihrer Funktionen ruft; fehlen ihre Dienste in der Grundprüfung, ist
 * das ein Typfehler. Schlüssel: Name des Moduls in den Meldungen.
 */
export const MITGLIEDER_LISTEN: {
	[K in keyof MitgliederDienste]: Record<string, MitgliederSchnittstelle<K>>;
} = {
	cm: CM_SCHNITTSTELLEN,
	anlass: ANLASS_SCHNITTSTELLEN,
	interclub: INTERCLUB_SCHNITTSTELLEN,
	profil: PROFIL_SCHNITTSTELLEN,
	gespraech: GESPRAECH_SCHNITTSTELLEN,
	passkey: PASSKEY_SCHNITTSTELLEN,
	mitteilung: MITTEILUNG_SCHNITTSTELLEN
};
