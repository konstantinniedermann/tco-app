import { afterEach, describe, expect, test, vi } from 'vitest';
import { GET } from './+server.ts';

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('/api/kontakt', () => {
	test('A-HILFE-01: Kontakt für Fragen ohne Login abrufbar', async () => {
		vi.stubEnv('MYTCO_CODE_SCHLUESSEL', 'nur-lokal-nicht-fuer-produktion-0123456789abcdef');
		vi.stubEnv('MYTCO_SMTP_URL', 'smtp://localhost:51025');
		vi.stubEnv('MYTCO_MAIL_ABSENDER', 'MyTCO <mytco@example.org>');
		vi.stubEnv('MYTCO_KONTAKT', 'das Sekretariat (erfunden), sekretariat@example.org');

		const res = await GET();

		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toBe('no-store');
		expect(await res.json()).toEqual({
			kontakt: 'das Sekretariat (erfunden), sekretariat@example.org'
		});
	});
});
