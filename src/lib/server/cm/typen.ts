// Dienst- und Ereignis-Typ der Schnittstellen zur Clubmeisterschaft. Keine Schnittstellen-Datei:
// Das Gespräch holt sie von hier.
import type { RequestEvent } from '@sveltejs/kit';
import type { Db } from '../db/index.ts';
import type { Ereignis } from '../http.ts';
import type { BestaetigungInhalt } from './mail.ts';

export type CmDienste = {
	db: Db;
	bestaetigung: (an: string, i: BestaetigungInhalt) => Promise<void>;
	/** FR-47: persönliche Meldung, Push, sonst E-Mail; wirft nie. */
	melde: (mitgliedIds: number[], m: { titel: string; text: string; pfad: string }) => Promise<void>;
	jetzt?: () => Date;
};
export type CmEreignis = Ereignis & Pick<RequestEvent, 'params'>;
