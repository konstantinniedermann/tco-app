import { describe, expect, it } from 'vitest';
import { codeMails, holeTestMailCode, type Abruf } from './test-pruefung-mail.ts';

// Attrappe für page.request: Playwright schreibt bei Netzfehlern die Request-Header samt
// Zugangscookie in die Fehlermeldung.
const GEHEIM = 'mytco_test_zugang=GEHEIMER-HASH';
const kaputt: Abruf = {
	get: () => Promise.reject(new Error(`connect ECONNRESET\n  cookie: ${GEHEIM}`))
};

function antwort(status: number, json: unknown) {
	return { ok: () => status < 400, status: () => status, json: () => Promise.resolve(json) };
}

describe('Mail-Fänger von Test', () => {
	it('gibt bei einem Netzfehler nur einen festen Text weiter, nie den Zugang', async () => {
		await expect(codeMails(kaputt, 'paul@example.org')).rejects.toThrow(
			/^Mail-Fänger von Test nicht erreichbar$/
		);
		await expect(holeTestMailCode(kaputt, 'paul@example.org', [])).rejects.toThrow(
			/^Mail-Fänger von Test nicht erreichbar$/
		);
	});

	it('gibt jedem Abruf eine eigene Zeitgrenze', async () => {
		const zeitgrenzen: (number | undefined)[] = [];
		const abruf: Abruf = {
			get: (_url, optionen) => {
				zeitgrenzen.push(optionen?.timeout);
				return Promise.resolve(
					antwort(200, { messages: [{ ID: 'a', Subject: '[Test für p] Dein Code für MyTCO' }] })
				);
			}
		};
		expect(await codeMails(abruf, 'p')).toEqual(['a']);
		expect(zeitgrenzen).toEqual([10_000]);
	});

	it('liest den Code aus der neuen Mail und übergeht die alten', async () => {
		const abruf: Abruf = {
			get: (url) =>
				Promise.resolve(
					url.includes('/search')
						? antwort(200, {
								messages: [
									{ ID: 'neu', Subject: '[Test für p] Dein Code für MyTCO' },
									{ ID: 'alt', Subject: '[Test für p] Dein Code für MyTCO' },
									{ ID: 'anders', Subject: '[Test für p] Neue Mitteilung' }
								]
							})
						: antwort(200, { Text: url.endsWith('/neu') ? 'Code 123456' : 'Code 999999' })
				)
		};
		expect(await holeTestMailCode(abruf, 'p', ['alt'])).toBe('123456');
	});
});
