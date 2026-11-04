import { describe, expect, test } from 'vitest';
import { pruefeDesignFestwerte } from '../../../../scripts/pruefungen/design-festwerte.ts';
import { erzeugeBriefCode, formatiereBriefCode } from '../login/codes.ts';
import { baueBriefHtml, type BriefDaten } from './brief.ts';

// Erfundenes Mitglied, erfundene Ansprechperson; der Code wird in jedem Test neu erzeugt.
function daten(aenderungen: Partial<BriefDaten> = {}): BriefDaten {
	return {
		vorname: 'Erika',
		nachname: 'Beispiel',
		strasse: 'Erfundenweg 7',
		plz: '4600',
		ort: 'Olten',
		code: erzeugeBriefCode(),
		gueltigBis: new Date('2027-01-31T12:00:00Z'),
		adresse: 'https://my.example.org',
		kontakt: 'das Sekretariat (erfunden), sekretariat@example.org',
		...aenderungen
	};
}

const TOKENS = ':root { --farbe-text: x; }';

function qrSvg(html: string): string {
	const treffer = /<div class="brief-qr">\s*(<svg[\s\S]*?<\/svg>)/.exec(html);
	expect(treffer).not.toBeNull();
	return (treffer as RegExpExecArray)[1];
}

describe('baueBriefHtml', () => {
	test('A-LOGIN-01: Brief enthält Code als zwei Fünfergruppen, gültig bis, App-Adresse als Text, QR-Code als <svg>, Ansprechperson und Datenschutz-Hinweis', () => {
		const d = daten();
		const html = baueBriefHtml(d, TOKENS);
		const [erste, zweite] = formatiereBriefCode(d.code).split('-');
		expect(erste).toHaveLength(5);
		expect(zweite).toHaveLength(5);
		expect(html).toContain(formatiereBriefCode(d.code));
		expect(html).toContain('gültig bis 31.01.2027');
		expect(html).toContain('<p class="brief-qr-adresse">https://my.example.org</p>');
		expect(qrSvg(html)).toMatch(/^<svg/);
		expect(html).toContain(
			'Fragen? Wende dich an das Sekretariat (erfunden), sekretariat@example.org.'
		);
		expect(html).toContain('https://my.example.org/datenschutz');
		expect(html).toContain('Hoi Erika');
		expect(html).toContain('Erika Beispiel');
		expect(html).toContain('Erfundenweg 7');
		expect(html).toContain('4600 Olten');
		expect(html).toContain(TOKENS);
	});

	test('gültig bis in Schweizer Zeit: kurz vor Mitternacht UTC ist schon der nächste Tag', () => {
		const html = baueBriefHtml(daten({ gueltigBis: new Date('2027-01-31T23:30:00Z') }), TOKENS);
		expect(html).toContain('gültig bis 01.02.2027');
	});

	test('Datenschutz-Hinweis maskiert die Adresse', () => {
		const html = baueBriefHtml(daten({ adresse: 'https://my.example.org/?a=1&b=2' }), TOKENS);
		expect(html).toContain(
			'Wie MyTCO mit deinen Daten umgeht: https://my.example.org/?a=1&amp;b=2/datenschutz'
		);
	});

	test('Brief maskiert alle eingesetzten Werte', () => {
		const html = baueBriefHtml(
			daten({
				vorname: '<script>x</script>',
				nachname: 'A & B',
				strasse: "O'Brien-Weg 1",
				kontakt: 'Kontakt "X" & <Y>',
				adresse: 'https://my.example.org/?a=1&b="2"'
			}),
			TOKENS
		);
		expect(html).not.toContain('<script>x</script>');
		expect(html).toContain('Hoi &lt;script&gt;x&lt;/script&gt;');
		expect(html).toContain('A &amp; B');
		expect(html).toContain('O&#39;Brien-Weg 1');
		expect(html).toContain('Kontakt &quot;X&quot; &amp; &lt;Y&gt;');
		expect(html).toContain('https://my.example.org/?a=1&amp;b=&quot;2&quot;');
		expect(html).not.toContain('b="2"');
	});

	test('QR-Code kodiert genau die App-Adresse', () => {
		const a = qrSvg(baueBriefHtml(daten(), TOKENS));
		const b = qrSvg(baueBriefHtml(daten({ vorname: 'Kurt', code: erzeugeBriefCode() }), TOKENS));
		const c = qrSvg(baueBriefHtml(daten({ adresse: 'https://andere.example.org' }), TOKENS));
		expect(a).toBe(b);
		expect(c).not.toBe(a);
	});

	test('Anleitung hat fünf Schritte für iPhone und Android', () => {
		const html = baueBriefHtml(daten(), TOKENS);
		const listen = [...html.matchAll(/<ol[^>]*>([\s\S]*?)<\/ol>/g)].map((t) => t[1]);
		expect(listen).toHaveLength(2);
		for (const liste of listen) expect(liste.match(/<li[\s>]/g)).toHaveLength(5);
		expect(html).toContain('iPhone');
		expect(html).toContain('Android');
		// Beschriftungen wie in der Hilfe von Apple und Google (A-HILFE-02, Stand iOS 26 / Chrome)
		expect(html).toContain('«Zu Home-Bildschirm hinzufügen»');
		expect(html).toContain('«Als Web-App öffnen»');
		expect(html).toContain('«Installieren und Verknüpfung erstellen»');
		expect(html).not.toContain('Zum Home-Bildschirm');
		expect(html).not.toContain('Zum Startbildschirm hinzufügen');
		// Symbole immer mit Text (UI-05): je ein SVG-Symbol in jeder Anleitung.
		for (const liste of listen) expect(liste).toMatch(/<svg class="symbol"/);
	});

	test('Druck-CSS nutzt nur Tokens, Symbole nur currentColor, kein style-Attribut', () => {
		const html = baueBriefHtml(daten(), '');
		const css = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? '';
		expect(css).toContain('@page');
		expect(pruefeDesignFestwerte(new Map([['src/brief.css', css]]))).toEqual([]);
		const ohneQr = html.replace(/<div class="brief-qr">[\s\S]*?<\/svg>/, '');
		expect(ohneQr).not.toMatch(/\sstyle=/);
		expect(ohneQr).not.toMatch(/#[0-9a-f]{3,8}\b|(?<![\w-])(?:black|white)(?![\w-])/i);
	});
});
