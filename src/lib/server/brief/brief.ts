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
 * Der Inhalt des Briefs mit dem Einmal-Code als `<article class="brief">`, ohne Stil: Das
 * Druck-Layout steht in `src/lib/design/brief.css` (die CSP erlaubt kein `<style>` und kein
 * `style=` in der App). Alle eingesetzten Werte sind HTML-maskiert.
 */
export function baueBriefInhalt(d: BriefDaten): string {
	const adresse = maskiere(d.adresse);
	const datenschutz = maskiere(`${d.adresse.replace(/\/+$/, '')}/datenschutz`);
	const code = maskiere(formatiereBriefCode(d.code));
	return `<article class="brief">
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
<li>Tippe auf ••• (falls da) und dann auf ${SYMBOL_TEILEN} «Teilen», dann auf «Zu Home-Bildschirm hinzufügen».</li>
<li>Lass «Als Web-App öffnen» an und tippe auf «Hinzufügen».</li>
<li>Öffne MyTCO über das neue Symbol auf dem Home-Bildschirm.</li>
<li>Tippe den Code ein. Danach bleibst du angemeldet.</li>
</ol>
</section>
<section>
<h2>Android (Chrome)</h2>
<ol>
<li>Scanne den QR-Code mit der Kamera oder tippe die Adresse in Chrome ein.</li>
<li>Tippe auf ${SYMBOL_MENUE} «Menü», dann auf «Installieren und Verknüpfung erstellen».</li>
<li>Bestätige mit «Installieren».</li>
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
</article>`;
}

/**
 * Der Brief als eigenständiges HTML (A4, Druck-Layout). `stile` ist der Inhalt von
 * `src/lib/design/tokens.css` und `brief.css`, aneinandergehängt; er wird eingebettet, weil das
 * PDF ohne Server entsteht.
 */
export function baueBriefHtml(d: BriefDaten, stile: string): string {
	return `<!doctype html>
<html lang="de-CH">
<head>
<meta charset="utf-8">
<title>MyTCO – Dein Zugang</title>
<style>
${stile}
</style>
</head>
<body>
${baueBriefInhalt(d)}
</body>
</html>
`;
}
