// Hilfen der E2E-Tests für Anlässe: legen einen erfundenen Anlass an und melden Mitglieder dazu an,
// über dieselbe Fachlogik wie der Server.
import { legeAnlassAn, melde } from '../../../src/lib/server/anlass/anlaesse.ts';
import { hole } from './verbindung.ts';

/** Erfundener Anlass weit in der Zukunft mit offener Anmeldung; gibt seine Nummer zurück. */
export async function legeOffenenAnlassAn(erstelltVon: number, titel: string): Promise<number> {
	return legeAnlassAn(hole().db, erstelltVon, {
		titel,
		beginn: new Date('2099-05-20T17:00:00Z'),
		ort: 'Clubhaus, Musterweg 1, Olten',
		einladung: '',
		anmeldeschluss: new Date('2099-05-17T21:59:00Z')
	});
}

/** Das Mitglied antwortet auf den Anlass, ohne Bemerkung (bei «kommt nicht» auf Wunsch mit). */
export async function meldeZumAnlass(
	anlassId: number,
	mitgliedId: number,
	antwort: 'kommt' | 'kommt-nicht',
	bemerkung: string | null = null
): Promise<void> {
	const r = await melde(hole().db, anlassId, mitgliedId, { antwort, bemerkung }, new Date());
	if (r !== 'ok') throw new Error(`Antwort auf Anlass ${anlassId}: ${r}`);
}
