import { describe, expect, it } from 'vitest';
import { geraetAusBrowser } from './geraet.ts';

const FAELLE: [string, string | null, string][] = [
	[
		'iPhone-Safari',
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
		'iPhone'
	],
	[
		'iPad',
		'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
		'iPad'
	],
	[
		'iPadOS mit Mac-UA',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
		'iPad'
	],
	[
		'Pixel-Chrome',
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
		'Android-Handy'
	],
	[
		'macOS-Safari',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
		'Mac'
	],
	[
		'Windows-Edge',
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
		'Windows-PC'
	],
	[
		'Linux-Firefox',
		'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
		'Gerät'
	],
	['null', null, 'Gerät'],
	['leer', '', 'Gerät']
];

describe('geraetAusBrowser', () => {
	it.each(FAELLE)('A-LOGIN-07: Gerätebezeichnung aus dem Browser (%s)', (_name, ua, erwartet) => {
		expect(geraetAusBrowser(ua)).toBe(erwartet);
	});
});
