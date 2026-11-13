// Verdrahtung der Routen (Vertrag, Schritt 03 des Refactorings, B-28): Jede `+server.ts` unter
// `src/routes/` wird geladen, und je Methode steht in ROUTEN, welche Schnittstellen-Funktion sie
// mit welchen Diensten aufruft. Geprüft wird das Verhalten, nicht der Quelltext: Die Funktionen der
// Schnittstellen-Module sind durch Aufzeichner ersetzt, die Dienste kommen aus den echten Einstiegen.
//
// Wer eine Route umhängt oder den Zusammenbau der Dienste ändert (Schritte 07, 09 bis 11), passt
// nur ROUTEN und EINSTIEGE an. Zieht eine Funktion in ein anderes Modul, ändert sich nur ihr Import;
// das Modul muss auf `schnittstellen.ts` enden (sonst `schnittstellenModule` erweitern), und eine
// neue Liste der Verwaltung gehört in `VERWALTUNGS_LISTEN` (`tests/hilfen/verwaltungs-listen.ts`),
// eine der Mitglieder in MITGLIEDER.
// Der Test liegt hier und nicht unter `src/routes/`: Dort gilt die Bauregel für jede Datei, und
// nur Admin-Routen dürfen die Verwaltung importieren.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../tests/hilfen/anfrage.ts';
import { VERWALTUNGS_LISTEN } from '../../../tests/hilfen/verwaltungs-listen.ts';
import {
	getAuskunft,
	getBriefe,
	getFairgate,
	getMitglied,
	getMitglieder,
	getRollen,
	getVerlauf,
	getZugang,
	postAnsicht,
	postAnsichtBeenden,
	postAustritt,
	postBrief as postBriefVerwaltung,
	postBriefe,
	postEinlesen,
	postEinlesenVorschau,
	postFairgate,
	postLoeschen,
	postLoeschenRueckgaengig,
	postMitglied,
	postMitglieder,
	postRollen,
	postSitzungen,
	postWiedereintritt,
	postZugang,
	postZugangCode
} from './admin/schnittstellen.ts';
import {
	ANLASS_SCHNITTSTELLEN,
	getAnlaesse,
	getAnlass,
	getKalender,
	postAnmeldung
} from './anlass/schnittstellen.ts';
import {
	getAdminAnlaesse,
	getAdminAnlass,
	postAdminAnlaesse,
	postAdminAnlass,
	postAdminAnlassLoeschen
} from './anlass/verwaltung-schnittstellen.ts';
import {
	CM_SCHNITTSTELLEN,
	getCmAnsicht,
	getCmPartner,
	getCmTurniere,
	postCmAbmeldung,
	postCmAnfrage,
	postCmAnfrageAblehnen,
	postCmAnfrageAnnehmen,
	postCmAnfrageZurueck,
	postCmAngaben,
	postCmAnmeldung,
	postCmSuchtext,
	postCmWildcard
} from './cm/schnittstellen.ts';
import {
	getAnmeldungen,
	getDoppel,
	getSpieler,
	postAnfrageAlsPaar,
	postAnfrageLoeschen,
	postAnmeldungLoeschen,
	postAnmeldungVonHand,
	postDoppelVonHand,
	postEntscheid,
	postKlassierung as postKlassierungVerwaltung,
	postPartnerAendern,
	postVerschieben,
	postZusammenlegen
} from './cm/verwaltung-schnittstellen.ts';
import { holeDb } from './db/index.ts';
import {
	holeAdminDienste,
	holeAnlassDienste,
	holeInterclubDienste,
	holeCmDienste,
	holeLoginDienst,
	holeMitteilungAdminDienste,
	holeMitteilungDienste,
	holePasskeyDienst,
	holeProfilDienste
} from './dienste.ts';
import {
	GESPRAECH_SCHNITTSTELLEN,
	getGespraech,
	postGelesen,
	postGespraech
} from './gespraech/schnittstellen.ts';
import {
	getAdminGespraech,
	getGespraeche,
	postAntwort,
	postZustand
} from './gespraech/verwaltung-schnittstellen.ts';
import {
	PASSKEY_SCHNITTSTELLEN,
	getPasskeys,
	postAnmelden,
	postAnmeldenOptionen,
	postEinrichten,
	postEinrichtenOptionen,
	postEntfernen,
	postHinweis
} from './login/passkey-schnittstellen.ts';
import {
	postBrief as postBriefLogin,
	postLogout,
	postMail,
	postMailCode
} from './login/schnittstellen.ts';
import {
	getInterclub,
	getInterclubTeam,
	INTERCLUB_SCHNITTSTELLEN
} from './interclub/schnittstellen.ts';
import { getSitzung } from './sitzung/schnittstellen.ts';
import {
	MITTEILUNG_SCHNITTSTELLEN,
	getBenachrichtigungen,
	postAbo,
	postAboLoeschen,
	postThemen
} from './mitteilung/schnittstellen.ts';
import {
	getAnlassMitteilungen,
	getVereinMitteilungen,
	postAnlassSenden,
	postAnlassVorschau,
	postVereinSenden,
	postVereinVorschau
} from './mitteilung/verwaltung-schnittstellen.ts';
import {
	PROFIL_SCHNITTSTELLEN,
	getProfil,
	postEmail,
	postEmailBestaetigen,
	postKlassierung as postKlassierungProfil,
	postProfil,
	postRufname
} from './profil/schnittstellen.ts';
import {
	getKategorie,
	getTurnier,
	getTurniere,
	postKategorie,
	postKategorieAbsagen,
	postKategorien,
	postTurnier,
	postTurnierStatus,
	postTurniere
} from './turnier/schnittstellen.ts';

/** Die Dienste-Einstiege; jede Route bekommt ihre Dienste von genau einem davon. */
const EINSTIEGE = {
	admin: holeAdminDienste,
	mitteilungAdmin: holeMitteilungAdminDienste,
	anlass: holeAnlassDienste,
	interclub: holeInterclubDienste,
	cm: holeCmDienste,
	login: holeLoginDienst,
	passkey: holePasskeyDienst,
	mitteilung: holeMitteilungDienste,
	profil: holeProfilDienste,
	db: holeDb
} satisfies Record<string, () => unknown>;

type Methode =
	'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'QUERY' | 'fallback';
type Verdrahtung = [funktion: (...args: never[]) => unknown, einstieg: keyof typeof EINSTIEGE];
/** Route ohne Schnittstellen-Funktion; ihr Verhalten prüft ein eigener Test neben der Route. */
const EIGEN = { eigen: ['GET'] } as const;

// Die eine Tabelle: Adresse → Methode → [Schnittstellen-Funktion, Dienste-Einstieg].
const ROUTEN: Record<string, Partial<Record<Methode, Verdrahtung>> | typeof EIGEN> = {
	'/api/admin/anfragen/[id]/loeschen': { POST: [postAnfrageLoeschen, 'mitteilungAdmin'] },
	'/api/admin/anfragen/[id]/paar': { POST: [postAnfrageAlsPaar, 'mitteilungAdmin'] },
	'/api/admin/anlaesse': { GET: [getAdminAnlaesse, 'admin'], POST: [postAdminAnlaesse, 'admin'] },
	'/api/admin/anlaesse/[id]': { GET: [getAdminAnlass, 'admin'], POST: [postAdminAnlass, 'admin'] },
	'/api/admin/anlaesse/[id]/loeschen': { POST: [postAdminAnlassLoeschen, 'admin'] },
	'/api/admin/anlaesse/[id]/mitteilungen': { GET: [getAnlassMitteilungen, 'mitteilungAdmin'] },
	'/api/admin/anlaesse/[id]/mitteilungen/senden': { POST: [postAnlassSenden, 'mitteilungAdmin'] },
	'/api/admin/anlaesse/[id]/mitteilungen/vorschau': {
		POST: [postAnlassVorschau, 'mitteilungAdmin']
	},
	'/api/admin/anmeldungen/[id]': { POST: [postVerschieben, 'mitteilungAdmin'] },
	'/api/admin/anmeldungen/[id]/entscheid': { POST: [postEntscheid, 'mitteilungAdmin'] },
	'/api/admin/anmeldungen/[id]/loeschen': { POST: [postAnmeldungLoeschen, 'mitteilungAdmin'] },
	'/api/admin/anmeldungen/[id]/partner': { POST: [postPartnerAendern, 'mitteilungAdmin'] },
	'/api/admin/anmeldungen/[id]/zusammenlegen': { POST: [postZusammenlegen, 'mitteilungAdmin'] },
	'/api/admin/ansicht': { POST: [postAnsicht, 'admin'] },
	'/api/admin/ansicht/beenden': { POST: [postAnsichtBeenden, 'admin'] },
	'/api/admin/briefe': { GET: [getBriefe, 'admin'], POST: [postBriefe, 'admin'] },
	'/api/admin/einlesen': { POST: [postEinlesen, 'admin'] },
	'/api/admin/einlesen/vorschau': { POST: [postEinlesenVorschau, 'admin'] },
	'/api/admin/fairgate': { GET: [getFairgate, 'admin'] },
	'/api/admin/fairgate/[id]': { POST: [postFairgate, 'admin'] },
	'/api/admin/gespraeche/[id]': {
		GET: [getAdminGespraech, 'mitteilungAdmin'],
		POST: [postAntwort, 'mitteilungAdmin']
	},
	'/api/admin/gespraeche/[id]/zustand': { POST: [postZustand, 'mitteilungAdmin'] },
	'/api/admin/kategorien/[id]': {
		GET: [getKategorie, 'admin'],
		POST: [postKategorie, 'mitteilungAdmin']
	},
	'/api/admin/kategorien/[id]/absagen': { POST: [postKategorieAbsagen, 'mitteilungAdmin'] },
	'/api/admin/kategorien/[id]/anmeldungen': {
		GET: [getAnmeldungen, 'mitteilungAdmin'],
		POST: [postAnmeldungVonHand, 'mitteilungAdmin']
	},
	'/api/admin/kategorien/[id]/doppel': {
		GET: [getDoppel, 'mitteilungAdmin'],
		POST: [postDoppelVonHand, 'mitteilungAdmin']
	},
	'/api/admin/mitglieder': { GET: [getMitglieder, 'admin'], POST: [postMitglieder, 'admin'] },
	'/api/admin/mitglieder/[id]': { GET: [getMitglied, 'admin'], POST: [postMitglied, 'admin'] },
	'/api/admin/mitglieder/[id]/auskunft': { GET: [getAuskunft, 'admin'] },
	'/api/admin/mitglieder/[id]/austritt': { POST: [postAustritt, 'mitteilungAdmin'] },
	'/api/admin/mitglieder/[id]/brief': { POST: [postBriefVerwaltung, 'admin'] },
	'/api/admin/mitglieder/[id]/loeschen-rueckgaengig': { POST: [postLoeschenRueckgaengig, 'admin'] },
	'/api/admin/mitglieder/[id]/loeschen': { POST: [postLoeschen, 'mitteilungAdmin'] },
	'/api/admin/mitglieder/[id]/rollen': { POST: [postRollen, 'admin'] },
	'/api/admin/mitglieder/[id]/sitzungen': { POST: [postSitzungen, 'admin'] },
	'/api/admin/mitglieder/[id]/wiedereintritt': { POST: [postWiedereintritt, 'admin'] },
	'/api/admin/mitteilungen': { GET: [getVereinMitteilungen, 'mitteilungAdmin'] },
	'/api/admin/mitteilungen/senden': { POST: [postVereinSenden, 'mitteilungAdmin'] },
	'/api/admin/mitteilungen/vorschau': { POST: [postVereinVorschau, 'mitteilungAdmin'] },
	'/api/admin/rollen': { GET: [getRollen, 'admin'] },
	'/api/admin/spieler': { GET: [getSpieler, 'mitteilungAdmin'] },
	'/api/admin/spieler/[id]/klassierung': { POST: [postKlassierungVerwaltung, 'mitteilungAdmin'] },
	'/api/admin/turniere': { GET: [getTurniere, 'admin'], POST: [postTurniere, 'admin'] },
	'/api/admin/turniere/[id]': { GET: [getTurnier, 'admin'], POST: [postTurnier, 'admin'] },
	'/api/admin/turniere/[id]/gespraeche': { GET: [getGespraeche, 'mitteilungAdmin'] },
	'/api/admin/turniere/[id]/kategorien': { POST: [postKategorien, 'admin'] },
	'/api/admin/turniere/[id]/status': { POST: [postTurnierStatus, 'admin'] },
	'/api/admin/verlauf': { GET: [getVerlauf, 'admin'] },
	'/api/admin/zugang': { GET: [getZugang, 'admin'], POST: [postZugang, 'admin'] },
	'/api/admin/zugang/code': { POST: [postZugangCode, 'admin'] },
	'/api/anlaesse': { GET: [getAnlaesse, 'anlass'] },
	'/api/anlaesse/[id]': { GET: [getAnlass, 'anlass'] },
	'/api/anlaesse/[id]/anmeldung': { POST: [postAnmeldung, 'anlass'] },
	'/api/benachrichtigungen': {
		GET: [getBenachrichtigungen, 'mitteilung'],
		POST: [postThemen, 'mitteilung']
	},
	'/api/benachrichtigungen/abo': { POST: [postAbo, 'mitteilung'] },
	'/api/benachrichtigungen/abo/loeschen': { POST: [postAboLoeschen, 'mitteilung'] },
	'/api/cm': { GET: [getCmTurniere, 'cm'] },
	'/api/cm/[id]': { GET: [getCmAnsicht, 'cm'] },
	'/api/cm/[id]/gespraech': { GET: [getGespraech, 'cm'], POST: [postGespraech, 'cm'] },
	'/api/cm/[id]/gespraech/gelesen': { POST: [postGelesen, 'cm'] },
	'/api/cm/anfragen/[id]/ablehnen': { POST: [postCmAnfrageAblehnen, 'cm'] },
	'/api/cm/anfragen/[id]/annehmen': { POST: [postCmAnfrageAnnehmen, 'cm'] },
	'/api/cm/anfragen/[id]/zurueckziehen': { POST: [postCmAnfrageZurueck, 'cm'] },
	'/api/cm/angaben': { POST: [postCmAngaben, 'cm'] },
	'/api/cm/anmeldungen/[id]/abmelden': { POST: [postCmAbmeldung, 'cm'] },
	'/api/cm/anmeldungen/[id]/suchtext': { POST: [postCmSuchtext, 'cm'] },
	'/api/cm/kategorien/[id]/anfragen': { POST: [postCmAnfrage, 'cm'] },
	'/api/cm/kategorien/[id]/anmeldung': { POST: [postCmAnmeldung, 'cm'] },
	'/api/cm/kategorien/[id]/partner': { GET: [getCmPartner, 'cm'] },
	'/api/cm/kategorien/[id]/wildcard': { POST: [postCmWildcard, 'cm'] },
	'/api/interclub': { GET: [getInterclub, 'interclub'] },
	'/api/interclub/teams/[id]': { GET: [getInterclubTeam, 'interclub'] },
	'/api/kalender/[kennung]': { GET: [getKalender, 'anlass'] },
	'/api/kontakt': EIGEN,
	'/api/login/brief': { POST: [postBriefLogin, 'login'] },
	'/api/login/mail-code': { POST: [postMailCode, 'login'] },
	'/api/login/mail': { POST: [postMail, 'login'] },
	'/api/logout': { POST: [postLogout, 'login'] },
	'/api/passkey': { GET: [getPasskeys, 'passkey'] },
	'/api/passkey/anmelden': { POST: [postAnmelden, 'passkey'] },
	'/api/passkey/anmelden/optionen': { POST: [postAnmeldenOptionen, 'passkey'] },
	'/api/passkey/einrichten': { POST: [postEinrichten, 'passkey'] },
	'/api/passkey/einrichten/optionen': { POST: [postEinrichtenOptionen, 'passkey'] },
	'/api/passkey/entfernen': { POST: [postEntfernen, 'passkey'] },
	'/api/passkey/hinweis': { POST: [postHinweis, 'passkey'] },
	'/api/profil': { GET: [getProfil, 'profil'], POST: [postProfil, 'profil'] },
	'/api/profil/email': { POST: [postEmail, 'profil'] },
	'/api/profil/email/bestaetigen': { POST: [postEmailBestaetigen, 'profil'] },
	'/api/profil/klassierung': { POST: [postKlassierungProfil, 'profil'] },
	'/api/profil/rufname': { POST: [postRufname, 'profil'] },
	'/api/sitzung': { GET: [getSitzung, 'db'] },
	'/api/status': EIGEN
};

/** Schnittstellen ausserhalb der Listen: Login und Sitzung, ohne Sitzung erreichbar (eigene Tests). */
const OHNE_LISTE = new Set<unknown>([
	postBriefLogin,
	postMailCode,
	postMail,
	postLogout,
	getSitzung
]);
// Eine neue Liste der Verwaltung gehört in `VERWALTUNGS_LISTEN` (`tests/hilfen/verwaltungs-listen.ts`;
// von dort nehmen sie auch Grundprüfung und Rechte-Matrix), eine der Mitglieder in MITGLIEDER und in
// `mitgliederDienste()` in `grundpruefung.db.test.ts` (dort laufen 401 und 415 über jeden Eintrag).
const VERWALTUNG = new Set<unknown>(
	Object.values(VERWALTUNGS_LISTEN).flatMap((l) => Object.values(l))
);
const MITGLIEDER = new Set<unknown>(
	[
		CM_SCHNITTSTELLEN,
		ANLASS_SCHNITTSTELLEN,
		INTERCLUB_SCHNITTSTELLEN,
		PROFIL_SCHNITTSTELLEN,
		GESPRAECH_SCHNITTSTELLEN,
		PASSKEY_SCHNITTSTELLEN,
		MITTEILUNG_SCHNITTSTELLEN
	].flatMap((l) => Object.values(l))
);

const routenModule = import.meta.glob<Record<string, unknown>>('/src/routes/**/+server.ts');
const schnittstellenModule = import.meta.glob('/src/lib/server/**/*schnittstellen.ts');
const name = (f: unknown) => (f as { name?: string }).name || '(ohne Namen)';
const adresse = (pfad: string) => pfad.slice('/src/routes'.length, -'/+server.ts'.length) || '/';

// Jede Funktion der Schnittstellen-Module zeichnet nur auf, wer sie womit aufgerufen hat, und
// antwortet mit einer eigenen Antwort. `echt` führt vom Aufzeichner zur echten Funktion (auch durch
// Weiterleitungen wie `export { … } from`), damit der Vergleich mit den Importen oben gelingt.
const aufrufe: { funktion: unknown; args: unknown[]; antwort: Response }[] = [];
const echt = new WeakMap<object, unknown>();

beforeAll(() => {
	vi.stubEnv('MYTCO_CODE_SCHLUESSEL', 'nur-lokal-nicht-fuer-produktion-0123456789abcdef');
	vi.stubEnv('MYTCO_SMTP_URL', 'smtp://127.0.0.1:1');
	vi.stubEnv('MYTCO_MAIL_ABSENDER', 'MyTCO <mytco@example.org>');
	vi.stubEnv('MYTCO_KONTAKT', 'kontakt@example.org');
	vi.stubEnv('MAIL_NUR_AN', '');
	vi.stubEnv('MYTCO_VAPID_OEFFENTLICH', '');
	vi.stubEnv('MYTCO_VAPID_PRIVAT', '');
	// Die Verbindung wird nie benutzt: Die Aufzeichner fragen die Datenbank nicht ab.
	vi.stubEnv('DATABASE_URL', 'postgres://mytco:x@127.0.0.1:1/keine');
	for (const pfad of Object.keys(schnittstellenModule)) {
		vi.doMock(pfad, async (importOriginal) => {
			const original = await importOriginal<Record<string, unknown>>();
			return Object.fromEntries(
				Object.entries(original).map(([name, wert]) => {
					if (typeof wert !== 'function') return [name, wert];
					const funktion = echt.get(wert) ?? wert;
					const aufzeichner = (...args: unknown[]) => {
						const antwort = new Response(null, { status: 299 });
						aufrufe.push({ funktion, args, antwort });
						return antwort;
					};
					echt.set(aufzeichner, funktion);
					return [name, aufzeichner];
				})
			);
		});
	}
});

afterAll(() => {
	vi.unstubAllEnvs();
});

describe('Verdrahtung der Routen', () => {
	test('jede +server.ts unter src/routes steht in ROUTEN, und jeder Eintrag hat eine Datei', () => {
		expect(Object.keys(routenModule).map(adresse).sort()).toEqual(Object.keys(ROUTEN).sort());
	});

	test('jede Methode ruft genau ihre Schnittstellen-Funktion mit den Diensten ihres Einstiegs auf', async () => {
		for (const [pfad, laden] of Object.entries(routenModule)) {
			const route = adresse(pfad);
			const modul = await laden();
			const soll = ROUTEN[route];
			// Eine Route ohne Eintrag meldet der Test oben.
			if (soll === undefined) continue;
			const methoden = 'eigen' in soll ? [...soll.eigen] : Object.keys(soll);
			expect([route, Object.keys(modul).sort()]).toEqual([route, methoden.sort()]);
			if ('eigen' in soll) continue;
			for (const [methode, [funktion, einstieg]] of Object.entries(soll)) {
				aufrufe.length = 0;
				const e = ereignis({ method: methode, params: { id: '1', kennung: 'k' } });
				const r = await (modul[methode] as (e: unknown) => Promise<Response>)(e);
				const wer = `${methode} ${route}`;
				expect([wer, aufrufe.length]).toEqual([wer, 1]);
				const [aufruf] = aufrufe;
				// Der Name macht die Meldung lesbar; entscheidend ist dieselbe Funktion.
				expect([wer, name(aufruf.funktion)]).toEqual([wer, name(funktion)]);
				expect([wer, aufruf.funktion === funktion]).toEqual([wer, true]);
				// Dienste und Anfrage, in der Reihenfolge der Funktion (getSitzung: Anfrage zuerst).
				expect([wer, aufruf.args.length, aufruf.args.includes(e)]).toEqual([wer, 2, true]);
				const von = Object.entries(EINSTIEGE)
					.filter(([, hole]) => aufruf.args.includes(hole()))
					.map(([schluessel]) => schluessel);
				expect([wer, von]).toEqual([wer, [einstieg]]);
				expect([wer, r === aufruf.antwort]).toEqual([wer, true]);
			}
		}
	});

	test('Routen der Verwaltung rufen nur Einträge der Verwaltungs-Listen, die übrigen nur Listen der Mitglieder oder Login', () => {
		for (const [route, soll] of Object.entries(ROUTEN)) {
			if ('eigen' in soll) continue;
			const erlaubt = route.startsWith('/api/admin/')
				? VERWALTUNG
				: new Set([...MITGLIEDER, ...OHNE_LISTE]);
			for (const [methode, [funktion]] of Object.entries(soll)) {
				expect([`${methode} ${route}`, erlaubt.has(funktion)]).toEqual([
					`${methode} ${route}`,
					true
				]);
			}
		}
	});
});
