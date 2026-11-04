import { describe, expect, test } from 'vitest';
import {
	erkenneGeraet,
	istAndererIphoneBrowser,
	laeuftVomSymbol,
	zeigeEinstieg
} from './geraet.ts';

const UA = {
	iphoneSafari:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
	iphoneChrome:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1',
	iphoneFirefox:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/143.0 Mobile/15E148 Safari/605.1.15',
	iphoneEdge:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/141.0 Mobile/15E148 Safari/605.1.15',
	pixelChrome:
		'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
	samsungTablet:
		'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Safari/537.36',
	ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
	windows:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
};

function fenster(standalone: boolean, iosStandalone?: boolean) {
	return {
		matchMedia: (abfrage: string) => ({
			matches: standalone && abfrage === '(display-mode: standalone)'
		}),
		navigator: { standalone: iosStandalone }
	};
}

describe('Erkennung des Geräts', () => {
	test('A-HILFE-02: iPhone und Android (auch Tablet) zählen als Handy, iPad und PC nicht', () => {
		expect(erkenneGeraet(UA.iphoneSafari)).toBe('iphone');
		expect(erkenneGeraet(UA.iphoneChrome)).toBe('iphone');
		expect(erkenneGeraet(UA.pixelChrome)).toBe('android');
		expect(erkenneGeraet(UA.samsungTablet)).toBe('android');
		expect(erkenneGeraet(UA.ipad)).toBe('andere');
		expect(erkenneGeraet(UA.windows)).toBe('andere');
	});

	test('A-HILFE-02: Chrome, Firefox und Edge auf dem iPhone sind andere Browser, Safari nicht', () => {
		expect(istAndererIphoneBrowser(UA.iphoneChrome)).toBe(true);
		expect(istAndererIphoneBrowser(UA.iphoneFirefox)).toBe(true);
		expect(istAndererIphoneBrowser(UA.iphoneEdge)).toBe(true);
		expect(istAndererIphoneBrowser(UA.iphoneSafari)).toBe(false);
	});

	test('A-HILFE-02: vom Symbol bei display-mode standalone oder navigator.standalone', () => {
		expect(laeuftVomSymbol(fenster(true))).toBe(true);
		expect(laeuftVomSymbol(fenster(false, true))).toBe(true);
		expect(laeuftVomSymbol(fenster(false, false))).toBe(false);
		expect(laeuftVomSymbol(fenster(false))).toBe(false);
	});

	test('A-HILFE-02: Einstieg nur auf dem Handy im Browser', () => {
		expect(zeigeEinstieg(UA.iphoneSafari, false)).toBe(true);
		expect(zeigeEinstieg(UA.pixelChrome, false)).toBe(true);
		expect(zeigeEinstieg(UA.iphoneSafari, true)).toBe(false);
		expect(zeigeEinstieg(UA.pixelChrome, true)).toBe(false);
		expect(zeigeEinstieg(UA.ipad, false)).toBe(false);
		expect(zeigeEinstieg(UA.windows, false)).toBe(false);
	});
});
