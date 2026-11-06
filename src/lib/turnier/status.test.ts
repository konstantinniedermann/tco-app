import { describe, expect, it } from 'vitest';
import { schlussZeitpunkt, vorSchluss, wirksamerStatus } from './status.ts';

describe('Status nach Anmeldeschluss', () => {
	it('FR-33: Anmeldeschluss 31.05.2027 gilt bis 23:59 Schweizer Zeit', () => {
		// Sommerzeit, UTC+2
		expect(vorSchluss('2027-05-31', new Date('2027-05-31T21:59:00Z'))).toBe(true);
		expect(vorSchluss('2027-05-31', new Date('2027-05-31T22:00:00Z'))).toBe(false);
		// Winterzeit, UTC+1
		expect(vorSchluss('2027-12-01', new Date('2027-12-01T22:59:00Z'))).toBe(true);
		expect(vorSchluss('2027-12-01', new Date('2027-12-01T23:00:00Z'))).toBe(false);
	});

	it('FR-33: der Schlusszeitpunkt ist 23:59 Schweizer Zeit', () => {
		expect(schlussZeitpunkt('2027-05-31').toISOString()).toBe('2027-05-31T21:59:00.000Z');
	});

	it('FR-33: offen nach Ablauf wirkt geschlossen, Vorbereitung bleibt', () => {
		const juni = new Date('2027-05-31T22:00:00Z');
		expect(wirksamerStatus('offen', '2027-05-31', juni)).toBe('geschlossen');
		expect(wirksamerStatus('vorbereitung', '2027-05-31', juni)).toBe('vorbereitung');
		expect(wirksamerStatus('geschlossen', '2027-05-31', juni)).toBe('geschlossen');
		expect(wirksamerStatus('offen', '2027-05-31', new Date('2027-05-31T21:59:00Z'))).toBe('offen');
	});
});
