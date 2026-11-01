import { describe, expect, test } from 'vitest';
import { APP_VERSION } from '../version';
import { istVersionVertraeglich, MINDESTVERSION } from './version';

describe('istVersionVertraeglich', () => {
	test.each([
		['0.1.0', '0.1.0', true],
		['0.2.0', '0.1.0', true],
		['1.0.0', '0.9.9', true],
		['0.1.1', '0.1.0', true],
		['0.0.9', '0.1.0', false],
		['0.1.0', '0.1.1', false],
		['0.9.0', '1.0.0', false],
		['0.10.0', '0.9.0', true] // numerisch, nicht als Text
	])('App %s gegen Mindestversion %s → %s', (app, min, erwartet) => {
		expect(istVersionVertraeglich(app, min)).toBe(erwartet);
	});

	test.each(['1.2', 'v1.2.3', '1.2.3-beta', '', '01.2.3', '1.2.3.4'])(
		'ungültige App-Version %j gilt als nicht verträglich',
		(app) => {
			expect(istVersionVertraeglich(app, '0.1.0')).toBe(false);
		}
	);

	test('ungültige Mindestversion ist ein Konfigurationsfehler', () => {
		expect(() => istVersionVertraeglich('0.1.0', 'x')).toThrow();
	});

	test('MINDESTVERSION ist gültig und nicht neuer als die App', () => {
		expect(istVersionVertraeglich(APP_VERSION, MINDESTVERSION)).toBe(true);
	});
});
