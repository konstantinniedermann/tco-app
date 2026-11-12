// Rechteprüfung der Verwaltung (RR-07, RR-09) und die Dienst-Typen, die sie braucht: der eine
// Durchsetzungspunkt für die Matrix in `src/lib/verwaltung/bereiche.ts`. Jede Schnittstelle der
// Verwaltung läuft über `liest` oder `schreibt`; nur der Zugang (`getZugang`, `postZugangCode`,
// `postZugang`, diese zwei mit `mitKonto`) und die «Ansicht als …» (`postAnsicht`,
// `postAnsichtBeenden`) in `schnittstellen.ts` prüfen selbst, ohne Bereich. Keine
// Schnittstellen-Datei: Andere Module holen `liest`, `schreibt` und die Typen von hier.
import type { RequestEvent } from '@sveltejs/kit';
import type { Db } from '../db/index.ts';
import { abgemeldet, antwort, formatFehler, istJson, leseKoerper, type Ereignis } from '../http.ts';
import type { BriefAbh } from './briefe.ts';
import type { Urheber } from './verlauf.ts';
import type { ZugangDienst } from './zugang.ts';
import { darf, type Art, type Bereich } from '../../verwaltung/bereiche.ts';

export type AdminEreignis = Ereignis & Pick<RequestEvent, 'params'>;

export type AdminDienste = {
	db: Db;
	zugang: ZugangDienst;
	// SI-09: Hinweis an die alte Adresse; wirft nie.
	hinweis: (an: string) => Promise<void>;
	// Schlüssel, Adresse und Kontakt für die Briefe (Brief-Code, Text).
	brief: BriefAbh;
	jetzt?: () => Date;
};

export type AdminUrheber = Extract<Urheber, { art: 'admin' | 'mitglied' }> & { art: 'admin' };

// Sitzung und eine Verwaltungsrolle (mytco, mitglieder oder cm) genügen; die Bestätigung per Code ist hier
// noch nicht nötig (SI-08: auch ein reiner CM muss den Code anfordern und einlösen können).
// Nur für `postZugangCode` und `postZugang`; alle anderen Schnittstellen laufen über `liest`/`schreibt`.
export async function mitKonto(
	d: AdminDienste,
	e: AdminEreignis,
	fn: (konto: NonNullable<AdminEreignis['locals']['konto']>) => Promise<Response>
): Promise<Response> {
	const konto = e.locals.konto;
	const z = await d.zugang.pruefe(konto);
	if (!konto || z.stufe === 'abgemeldet') return abgemeldet();
	if (z.stufe === 'keine-rolle') return antwort(403, { fehler: 'kein-admin' });
	return fn(konto);
}

// RR-07, RR-09: bestätigte Sitzung mit einer Rolle, die den Bereich so nutzen darf. Reihenfolge:
// Wer den Bereich nicht einmal lesen darf, bekommt `kein-admin` (der Code für «dieser Bereich ist
// dir nicht offen»), nicht die Aufforderung zum Bestätigen. Wer ihn nur lesen darf und schreiben
// will, bekommt nach der Bestätigung `kein-recht` (Regel 3: der MyTCO-Admin liest).
// In der «Ansicht als …» speichert keine Schnittstelle, auch ohne den Riegel im Hook (zweite Schicht);
// lesende Aufrufe wie die Auskunft (DS-07) schreiben trotzdem ihren Verlaufseintrag.
async function mitRolle(
	d: AdminDienste,
	e: AdminEreignis,
	bereich: Bereich,
	art: Art,
	fn: (mitgliedId: number) => Promise<Response>
): Promise<Response> {
	const z = await d.zugang.pruefe(e.locals.konto);
	if (z.stufe === 'abgemeldet') return abgemeldet();
	if (art === 'schreiben' && e.locals.konto?.ansicht != null) {
		return antwort(403, { fehler: 'nur-ansehen' });
	}
	if (z.stufe === 'keine-rolle' || !darf(z.rollen, bereich, 'lesen')) {
		return antwort(403, { fehler: 'kein-admin' });
	}
	if (z.stufe === 'unbestaetigt') return antwort(403, { fehler: 'unbestaetigt' });
	if (!darf(z.rollen, bereich, art)) return antwort(403, { fehler: 'kein-recht' });
	return fn(z.mitgliedId);
}

/** Lesende Schnittstelle eines Bereichs (BEREICHE). */
export function liest(
	d: AdminDienste,
	e: AdminEreignis,
	bereich: Bereich,
	fn: (mitgliedId: number) => Promise<Response>
): Promise<Response> {
	return mitRolle(d, e, bereich, 'lesen', fn);
}

/**
 * Schreibende Schnittstelle eines Bereichs (BEREICHE), mit dem Angemeldeten als Urheber für den
 * Änderungsverlauf. SI-10: nur als JSON; der Körper wird erst nach der Prüfung der Rechte gelesen.
 */
export async function schreibt(
	d: AdminDienste,
	e: AdminEreignis,
	bereich: Bereich,
	fn: (urheber: AdminUrheber, koerper: Record<string, unknown>) => Promise<Response>
): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitRolle(d, e, bereich, 'schreiben', async (mitgliedId) =>
		fn({ art: 'admin', mitgliedId }, await leseKoerper(e))
	);
}
