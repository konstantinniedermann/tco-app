import type { AnlassAnsicht } from './api.ts';
import { formatiereTag } from './zeit.ts';

/** Was die Kachel und die Seite eines Anlasses zum eigenen Stand sagen. */
export function standText(a: AnlassAnsicht): string {
	if (a.zuPruefen) return 'Datum oder Ort geändert, bitte prüfe deine Antwort';
	if (a.antwort === 'kommt') return 'Du kommst';
	if (a.antwort === 'kommt-nicht') return 'Du kommst nicht';
	if (!a.offen) return 'Anmeldung geschlossen';
	return `Bitte bis ${formatiereTag(a.anmeldeschluss)} an- oder abmelden`;
}
