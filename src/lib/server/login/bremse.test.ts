import { describe, expect, it } from 'vitest';
import { Bremse, erstelleBremsen } from './bremse.ts';

const MINUTE = 60_000;
const STUNDE = 60 * MINUTE;

function zeit() {
	let t = 0;
	return {
		jetzt: () => t,
		setze: (neu: number) => {
			t = neu;
		}
	};
}

describe('Bremse', () => {
	it('SI-02: nach 10 gezählten Fehlversuchen ist die IP gesperrt, nach einer Stunde wieder frei', () => {
		const uhr = zeit();
		const { briefFehlerProIp } = erstelleBremsen(uhr.jetzt);
		for (let i = 0; i < 10; i++) {
			expect(briefFehlerProIp.erlaubt('ip')).toBe(true);
			briefFehlerProIp.zaehle('ip');
		}
		expect(briefFehlerProIp.erlaubt('ip')).toBe(false);
		uhr.setze(STUNDE);
		expect(briefFehlerProIp.erlaubt('ip')).toBe(false);
		uhr.setze(STUNDE + 1);
		expect(briefFehlerProIp.erlaubt('ip')).toBe(true);
	});

	it('SI-18: passkeyFehlerProIp hat Grenze 10 und Fenster 1 h', () => {
		const uhr = zeit();
		const { passkeyFehlerProIp } = erstelleBremsen(uhr.jetzt);
		for (let i = 0; i < 10; i++) {
			expect(passkeyFehlerProIp.erlaubt('ip')).toBe(true);
			passkeyFehlerProIp.zaehle('ip');
		}
		expect(passkeyFehlerProIp.erlaubt('ip')).toBe(false);
		uhr.setze(STUNDE);
		expect(passkeyFehlerProIp.erlaubt('ip')).toBe(false);
		uhr.setze(STUNDE + 1);
		expect(passkeyFehlerProIp.erlaubt('ip')).toBe(true);
	});

	it('SI-04: 3 Mails pro Adresse und Stunde, 10 pro Tag', () => {
		const uhr = zeit();
		const { mailsProAdresseStunde, mailsProAdresseTag } = erstelleBremsen(uhr.jetzt);
		const sende = (adresse: string): boolean => {
			if (!mailsProAdresseStunde.erlaubt(adresse) || !mailsProAdresseTag.erlaubt(adresse)) {
				return false;
			}
			mailsProAdresseStunde.zaehle(adresse);
			mailsProAdresseTag.zaehle(adresse);
			return true;
		};

		// Innerhalb einer Stunde nur 3
		expect([1, 2, 3, 4, 5].map(() => sende('a'))).toEqual([true, true, true, false, false]);

		// Jede weitere Stunde 3 mehr, aber am Tag nur 10 insgesamt
		let gesendet = 3;
		for (let stunde = 1; stunde < 6; stunde++) {
			uhr.setze(stunde * (STUNDE + 1));
			for (let i = 0; i < 5; i++) if (sende('a')) gesendet++;
		}
		expect(gesendet).toBe(10);
	});

	it('SI-09: 3 Wechsel-Anfragen pro Konto und Stunde, 10 pro Tag', () => {
		const uhr = zeit();
		const { wechselProKontoStunde, wechselProKontoTag } = erstelleBremsen(uhr.jetzt);
		const starte = (konto: string): boolean => {
			if (!wechselProKontoStunde.erlaubt(konto) || !wechselProKontoTag.erlaubt(konto)) {
				return false;
			}
			wechselProKontoStunde.zaehle(konto);
			wechselProKontoTag.zaehle(konto);
			return true;
		};

		expect([1, 2, 3, 4].map(() => starte('7'))).toEqual([true, true, true, false]);
		uhr.setze(STUNDE);
		expect(starte('7')).toBe(false);

		let gestartet = 3;
		for (let stunde = 1; stunde < 6; stunde++) {
			uhr.setze(stunde * (STUNDE + 1));
			for (let i = 0; i < 5; i++) if (starte('7')) gestartet++;
		}
		expect(gestartet).toBe(10);
		uhr.setze(24 * STUNDE + 1);
		expect(starte('7')).toBe(true);
	});

	it('DS-06: raeumeAuf vergisst Schlüssel ohne Eintrag im Fenster', () => {
		const uhr = zeit();
		const bremse = new Bremse({ grenze: 10, fensterMs: 24 * STUNDE, jetzt: uhr.jetzt });
		bremse.zaehle('a');
		bremse.zaehle('b');
		expect(bremse.groesse).toBe(2);
		uhr.setze(24 * STUNDE);
		bremse.raeumeAuf();
		expect(bremse.groesse).toBe(2);
		uhr.setze(24 * STUNDE + 1);
		bremse.raeumeAuf();
		expect(bremse.groesse).toBe(0);
	});

	it('Schlüssel sind unabhängig', () => {
		const bremse = new Bremse({ grenze: 1, fensterMs: STUNDE });
		bremse.zaehle('a');
		expect(bremse.erlaubt('a')).toBe(false);
		expect(bremse.erlaubt('b')).toBe(true);
	});
});
