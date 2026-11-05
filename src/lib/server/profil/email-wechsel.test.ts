import { afterEach, describe, expect, test, vi } from 'vitest';
import {
	AUFRAEUMEN_MS,
	WECHSEL_MAX,
	WechselSpeicher,
	erstelleEmailWechselDienst,
	type Wechsel
} from './email-wechsel.ts';

function eintrag(bis: number): Wechsel {
	return {
		bisherige: 'lea@example.org',
		neue: 'lea.neu@example.org',
		hashAlt: 'a',
		hashNeu: 'b',
		bis,
		fehlversuche: 0,
		vergeben: false
	};
}

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('WechselSpeicher', () => {
	test('A-KONTO-01: raeumeAuf entfernt abgelaufene Wechsel, gültige bleiben', () => {
		const zeit = { t: 1000 };
		const s = new WechselSpeicher(() => zeit.t);
		s.lege(1, eintrag(2000));
		s.lege(2, eintrag(5000));
		s.lege(3, eintrag(2000));
		zeit.t = 2000;
		s.raeumeAuf();
		expect(s.groesse).toBe(3);
		zeit.t = 2001;
		s.raeumeAuf();
		expect(s.groesse).toBe(1);
		expect(s.hole(2)).not.toBeNull();
	});

	test('A-KONTO-01: Obergrenze, der älteste Wechsel fliegt zuerst raus', () => {
		const s = new WechselSpeicher(() => 0, 3);
		for (const id of [1, 2, 3, 4]) s.lege(id, eintrag(10));
		expect(s.groesse).toBe(3);
		expect(s.hole(1)).toBeNull();
		expect([2, 3, 4].map((id) => s.hole(id) !== null)).toEqual([true, true, true]);
	});

	test('A-KONTO-01: ein neuer Wechsel desselben Kontos wird jüngster, nicht doppelt gezählt', () => {
		const s = new WechselSpeicher(() => 0, 2);
		s.lege(1, eintrag(10));
		s.lege(2, eintrag(10));
		s.lege(1, eintrag(10));
		expect(s.groesse).toBe(2);
		s.lege(3, eintrag(10));
		expect([s.hole(1) !== null, s.hole(2) !== null, s.hole(3) !== null]).toEqual([
			true,
			false,
			true
		]);
	});

	test('A-KONTO-01: die Standardgrenze ist 1000', () => {
		expect(WECHSEL_MAX).toBe(1000);
		const s = new WechselSpeicher(() => 0);
		for (let id = 1; id <= WECHSEL_MAX + 1; id++) s.lege(id, eintrag(10));
		expect(s.groesse).toBe(WECHSEL_MAX);
		expect(s.hole(1)).toBeNull();
	});
});

describe('erstelleEmailWechselDienst', () => {
	test('A-KONTO-01: räumt alle 10 Minuten auf, ohne den Prozess zu halten', () => {
		vi.useFakeTimers();
		const spaehe = vi.spyOn(globalThis, 'setInterval');
		erstelleEmailWechselDienst({
			db: {} as never,
			schluessel: 'x'.repeat(40),
			kontakt: 'kontakt@example.org',
			mailer: async () => {},
			bremsen: {} as never
		});
		expect(spaehe).toHaveBeenCalledTimes(1);
		expect(spaehe.mock.calls[0][1]).toBe(AUFRAEUMEN_MS);
		expect(AUFRAEUMEN_MS).toBe(10 * 60 * 1000);
		// Ein Lauf des Timers wirft nicht, auch ohne Einträge.
		expect(() => vi.advanceTimersByTime(AUFRAEUMEN_MS)).not.toThrow();
	});
});
