import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { pruefeDesignFestwerte } from '../../../../scripts/pruefungen/design-festwerte.ts';
import { erzeugeBriefCode, formatiereBriefCode } from '../login/codes.ts';
import { baueBriefHtml, baueBriefInhalt, type BriefDaten } from './brief.ts';

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
const BRIEF_CSS = readFileSync('src/lib/design/brief.css', 'utf-8');

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
		expect(BRIEF_CSS).toContain('@page brief');
		expect(pruefeDesignFestwerte(new Map([['src/lib/design/brief.css', BRIEF_CSS]]))).toEqual([]);
		const ohneQr = html.replace(/<div class="brief-qr">[\s\S]*?<\/svg>/, '');
		expect(ohneQr).not.toMatch(/\sstyle=/);
		expect(ohneQr).not.toMatch(/#[0-9a-f]{3,8}\b|(?<![\w-])(?:black|white)(?![\w-])/i);
	});

	test('A-LOGIN-01: jeder Brief druckt auf eine eigene A4-Seite ohne Rand (@page brief)', () => {
		const css = BRIEF_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
		expect(css).toMatch(/@page brief\s*\{[^}]*size:\s*A4;/);
		const regel = /(?:^|\})\s*\.brief\s*\{([^}]*)\}/.exec(css);
		expect(regel).not.toBeNull();
		expect((regel as RegExpExecArray)[1]).toMatch(/(?:^|;|\s)page:\s*brief;/);
	});

	test('brief.css wirkt nur unter .brief (läuft in der App global)', () => {
		const css = BRIEF_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
		const selektoren = [...css.matchAll(/(?:^|[}{])\s*([^{}@]+)\{/g)].map((t) => t[1].trim());
		expect(selektoren.length).toBeGreaterThan(5);
		for (const liste of selektoren) {
			for (const sel of liste.split(/,(?![^()]*\))/)) {
				expect(sel.trim()).toMatch(/^(?:html:has\(\.brief\)|body:has\(\.brief\)|\.brief)(?![\w-])/);
			}
		}
	});
});

describe('baueBriefInhalt', () => {
	test('RR-04: Briefinhalt kommt ohne Stil aus (CSP)', () => {
		const inhalt = baueBriefInhalt(daten());
		expect(inhalt).not.toContain('<style');
		expect(inhalt).not.toContain(' style=');
		expect(inhalt.startsWith('<article class="brief">')).toBe(true);
	});

	test('A-LOGIN-01: Briefinhalt maskiert Namen mit Sonderzeichen', () => {
		const inhalt = baueBriefInhalt(daten({ vorname: 'Ana<b>&"\'' }));
		expect(inhalt).toContain('Ana&lt;b&gt;&amp;&quot;&#39;');
		expect(inhalt).not.toContain('<b>');
	});

	test('A-LOGIN-01: eigenständiger Brief bettet die Stile ein', () => {
		const d = daten({ code: 'ABCDEFGHJK' });
		const html = baueBriefHtml(d, 'X-STIL');
		expect(html).toMatch(/<style>[\s\S]*X-STIL[\s\S]*<\/style>/);
		expect(html).toContain(baueBriefInhalt(d));
	});
});
