// Nur die Antwort von `/api/sitzung` an die Oberfläche: wer angemeldet ist, ob die Navigation die
// Verwaltung zeigt, die «Ansicht als …» und die Zahl der offenen Gespräche. Sie setzt drei Themen
// zusammen (Sitzung aus `login`, Rollen aus `admin`, Gespräche aus `gespraech`) und steht darum
// über ihnen. Nicht zu verwechseln mit `login/sitzung.ts` (Cookie, Speicher und Prüfung der
// Sitzung; die Sitzung selbst lebt in `login/`) und `src/lib/login/sitzung.ts` (Oberfläche).
import type { Db } from '../db/index.ts';
import { offeneGespraecheGesamt } from '../gespraech/gespraech.ts';
import { effektiveRollen, verwaltungsrollen } from '../admin/rollen.ts';
import { abgemeldet, antwort, type Ereignis } from '../http.ts';

// RR-07: `verwaltung` (eine Verwaltungsrolle, in der «Ansicht als …» die der Ansicht) blendet nur
// die Navigation ein; durchgesetzt wird es an den Admin-Schnittstellen. `ansicht` zeigt das Band.
// Weder `mitgliedId` noch `sitzungHash` gehen an den Browser.
export async function getSitzung(
	e: Ereignis,
	db: Db,
	jetzt: () => Date = () => new Date()
): Promise<Response> {
	const konto = e.locals.konto;
	if (!konto) return abgemeldet();
	const rollen = effektiveRollen(await verwaltungsrollen(db, konto.kontoId), konto.ansicht);
	return antwort(200, {
		vorname: konto.vorname,
		rufname: konto.rufname,
		passkeyHinweis: konto.passkeyHinweis,
		verwaltung: rollen.length > 0,
		ansicht: konto.ansicht,
		// FR-52: Kachel der Verwaltung; nur wer als CM-Admin gilt (auch in der Ansicht), sonst 0.
		nachrichtenOffen: rollen.includes('cm') ? await offeneGespraecheGesamt(db, jetzt()) : 0
	});
}
