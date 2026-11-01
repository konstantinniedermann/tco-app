import { afterEach, describe, expect, test, vi } from 'vitest';
import { ermittleStatus } from './status.ts';

function wirft(fehler: unknown) {
	return () => {
		throw fehler;
	};
}

describe('ermittleStatus loggt bei einem Fehler höchstens den Fehlercode', () => {
	const log = vi.spyOn(console, 'error').mockImplementation(() => {});
	afterEach(() => log.mockClear());

	test('Code aus der Ursache (Drizzle verpackt den pg-Fehler)', async () => {
		const ursache = Object.assign(new Error('connect ECONNREFUSED 10.0.0.1:5432'), {
			code: 'ECONNREFUSED'
		});
		const antwort = await ermittleStatus(wirft(new Error('Failed query', { cause: ursache })));
		expect(antwort.status).toBe('fehler');
		expect(log.mock.calls).toEqual([['Datenbank nicht erreichbar (ECONNREFUSED)']]);
	});

	test('Code direkt am Fehler', async () => {
		await ermittleStatus(wirft(Object.assign(new Error('x'), { code: '28P01' })));
		expect(log.mock.calls).toEqual([['Datenbank nicht erreichbar (28P01)']]);
	});

	test('ohne Code oder mit Code, der Details enthalten könnte, nur die feste Zeile', async () => {
		await ermittleStatus(wirft(new Error('DATABASE_URL fehlt')));
		await ermittleStatus(wirft(Object.assign(new Error('x'), { code: 'user geheim' })));
		await ermittleStatus(wirft('kein Error-Objekt'));
		expect(log.mock.calls).toEqual([
			['Datenbank nicht erreichbar'],
			['Datenbank nicht erreichbar'],
			['Datenbank nicht erreichbar']
		]);
	});
});
