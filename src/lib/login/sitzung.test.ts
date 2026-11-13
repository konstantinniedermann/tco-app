import { describe, expect, it } from 'vitest';
import { hatSitzung } from './sitzung.ts';

const antwortMit = (status: number) => (async () => new Response('{}', { status })) as typeof fetch;

describe('hatSitzung', () => {
	it('ist angemeldet, wenn /api/sitzung mit 200 antwortet', async () => {
		expect(await hatSitzung(antwortMit(200))).toBe(true);
	});

	it('ist nicht angemeldet ohne Sitzung (401)', async () => {
		expect(await hatSitzung(antwortMit(401))).toBe(false);
	});

	it('ist nicht angemeldet, wenn das Netz weg ist', async () => {
		const weg = (async () => {
			throw new TypeError('Failed to fetch');
		}) as typeof fetch;
		expect(await hatSitzung(weg)).toBe(false);
	});
});

describe('hatSitzung: Ränder', () => {
	it('ist nicht angemeldet, wenn der Server gestört ist (503)', async () => {
		expect(await hatSitzung(antwortMit(503))).toBe(false);
	});
});
