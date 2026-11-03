import qrcode from 'qrcode-generator';
import { formatiereDatum } from '../datum.ts';
import { formatiereBriefCode } from '../login/codes.ts';
import { SYMBOL_MENUE, SYMBOL_TEILEN } from './symbole.ts';

export type BriefDaten = {
	vorname: string;
	nachname: string;
	strasse: string;
	plz: string;
	ort: string;
	code: string;
	gueltigBis: Date;
	adresse: string;
	kontakt: string;
};

// Druck-Layout nur aus Tokens (UI-Leitbild, Abschnitt «Brief (Druck)»); die mm-Masse des
// Papiers stehen in tokens.css. Annahme K-16.1: Fensterkuvert C5/6 mit Fenster rechts, die
// Lage des Adressfelds kommt aus --brief-fenster-*.
const DRUCK_CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; }
html { font-size: var(--brief-schrift); }
body {
	background: var(--farbe-flaeche);
	color: var(--farbe-text);
	font-family: var(--schrift-text);
	font-size: var(--groesse-klein);
	line-height: var(--zeilenhoehe-text);
}
h1, h2, p, ol, address { margin: 0; }
.brief { position: relative; padding: var(--brief-rand); }
.brief-absender {
	position: absolute;
	top: var(--brief-rand);
	left: var(--brief-rand);
	color: var(--farbe-marke);
	font-size: var(--groesse-gross);
	font-weight: 700;
	line-height: var(--zeilenhoehe-titel);
}
.brief-absender span { display: block; color: var(--farbe-text-leise); font-size: var(--groesse-klein); font-weight: 400; }
.brief-fenster {
	margin-top: calc(var(--brief-fenster-oben) - var(--brief-rand));
	margin-left: calc(var(--brief-fenster-links) - var(--brief-rand));
	width: var(--brief-fenster-breite);
	font-size: var(--groesse-text);
	font-style: normal;
}
.brief-inhalt { margin-top: var(--abstand-6); display: grid; gap: var(--abstand-5); }
.brief-inhalt h1 { color: var(--farbe-marke); font-size: var(--groesse-gross); line-height: var(--zeilenhoehe-titel); }
.brief-text { display: grid; gap: var(--abstand-2); }
.brief-zugang {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: var(--abstand-6);
	align-items: center;
	padding: var(--abstand-4);
	border: var(--rand-dick) solid var(--farbe-marke);
	border-radius: var(--radius);
}
.brief-qr svg { display: block; width: var(--brief-qr); height: var(--brief-qr); margin: 0 auto; }
.brief-qr-adresse { margin-top: var(--abstand-1); font-family: var(--schrift-code); text-align: center; white-space: nowrap; }
.brief-code-titel { color: var(--farbe-text-leise); }
.brief-code {
	font-family: var(--schrift-code);
	font-size: var(--groesse-titel);
	font-weight: 700;
	letter-spacing: var(--abstand-1);
	line-height: var(--zeilenhoehe-titel);
}
.brief-anleitung { display: grid; grid-template-columns: 1fr 1fr; gap: var(--abstand-6); }
.brief-anleitung h2 { color: var(--farbe-marke); font-size: var(--groesse-text); margin-bottom: var(--abstand-2); }
.brief-anleitung ol { display: grid; gap: var(--abstand-2); padding-left: var(--abstand-5); }
.symbol { width: var(--groesse-symbol); height: var(--groesse-symbol); vertical-align: middle; color: var(--farbe-marke); }
.brief-leise { color: var(--farbe-text-leise); }
`;

const ZEICHEN: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

function maskiere(text: string): string {
	return text.replace(/[&<>"']/g, (zeichen) => ZEICHEN[zeichen]);
}

/** QR-Code als skalierbares SVG; Ruhezone 4 Module (cellSize 1, margin 4). */
function qrSvg(adresse: string): string {
	const qr = qrcode(0, 'M');
	qr.addData(adresse);
	qr.make();
	return qr.createSvgTag({ cellSize: 1, margin: 4, scalable: true });
}

/**
 * Der Brief mit dem Einmal-Code als eigenständiges HTML (A4, Druck-Layout). `tokensCss` ist
 * der Inhalt von `src/lib/design/tokens.css`; er wird eingebettet, weil das PDF ohne Server
 * entsteht. Alle eingesetzten Werte sind HTML-maskiert.
 */
export function baueBriefHtml(d: BriefDaten, tokensCss: string): string {
	const adresse = maskiere(d.adresse);
	const datenschutz = maskiere(`${d.adresse.replace(/\/+$/, '')}/datenschutz`);
	const code = maskiere(formatiereBriefCode(d.code));
	return `<!doctype html>
<html lang="de-CH">
<head>
<meta charset="utf-8">
<title>MyTCO – Dein Zugang</title>
<style>
${tokensCss}
${DRUCK_CSS}
</style>
</head>
<body>
<main class="brief">
<p class="brief-absender">TC Olten<span>MyTCO, die App für Mitglieder</span></p>
<address class="brief-fenster">${maskiere(d.vorname)} ${maskiere(d.nachname)}<br>${maskiere(d.strasse)}<br>${maskiere(d.plz)} ${maskiere(d.ort)}</address>
<div class="brief-inhalt">
<div class="brief-text">
<h1>Hoi ${maskiere(d.vorname)}</h1>
<p>Mit MyTCO meldest du dich für die Clubmeisterschaft an und hältst deine Angaben aktuell. Richte die App einmal ein, danach bleibst du angemeldet.</p>
</div>
<div class="brief-zugang">
<div>
<div class="brief-qr">${qrSvg(d.adresse)}</div>
<p class="brief-qr-adresse">${adresse}</p>
</div>
<div>
<p class="brief-code-titel">Dein persönlicher Code</p>
<p class="brief-code">${code}</p>
<p>gültig bis ${formatiereDatum(d.gueltigBis)}</p>
</div>
</div>
<div class="brief-anleitung">
<section>
<h2>iPhone (Safari)</h2>
<ol>
<li>Scanne den QR-Code mit der Kamera oder tippe die Adresse in Safari ein.</li>
<li>Tippe auf ${SYMBOL_TEILEN} «Teilen», dann auf «Zum Home-Bildschirm».</li>
<li>Bestätige mit «Hinzufügen».</li>
<li>Öffne MyTCO über das neue Symbol auf dem Home-Bildschirm.</li>
<li>Tippe den Code ein. Danach bleibst du angemeldet.</li>
</ol>
</section>
<section>
<h2>Android (Chrome)</h2>
<ol>
<li>Scanne den QR-Code mit der Kamera oder tippe die Adresse in Chrome ein.</li>
<li>Tippe auf ${SYMBOL_MENUE} «Menü», dann auf «App installieren» bzw. «Zum Startbildschirm hinzufügen».</li>
<li>Bestätige mit «Installieren» bzw. «Hinzufügen».</li>
<li>Öffne MyTCO über das neue Symbol auf dem Startbildschirm.</li>
<li>Tippe den Code ein. Danach bleibst du angemeldet.</li>
</ol>
</section>
</div>
<div class="brief-text">
<p>Fragen? Wende dich an ${maskiere(d.kontakt)}.</p>
<p class="brief-leise">Wie MyTCO mit deinen Daten umgeht: ${datenschutz}</p>
</div>
</div>
</main>
</body>
</html>
`;
}
