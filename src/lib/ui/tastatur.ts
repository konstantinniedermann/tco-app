// Eingabe mit Tastatur (UI-Leitbild, Abschnitt «Eingabe mit Tastatur»): Vorbild sind Formulare
// in iOS-Apps. Solange ein Feld den Fokus hat, sind die Reiter weg (CSS über data-tastatur),
// die App endet über der Tastatur, und die Eingabetaste springt ins nächste Feld.
//
// Safari verkleinert beim Öffnen der Tastatur nur den sichtbaren Ausschnitt (visualViewport),
// nicht die Seite, und schiebt die Seite nach oben, damit das Feld sichtbar ist. Die App wird
// darum so hoch wie der Ausschnitt (--hoehe-sichtbar) und die Seite zurück nach oben gesetzt;
// das Feld rückt dann im Rollbereich ins Blickfeld. Chrome kennt dafür `interactive-widget`,
// Safari nicht; dieser eine Weg gilt für beide.

const OHNE_TASTATUR = new Set([
	'checkbox',
	'radio',
	'submit',
	'button',
	'reset',
	'file',
	'image',
	'range',
	'color',
	'hidden'
]);

/** Ob ein Feld (Tag-Name, `type`) beim Antippen die Tastatur oder die Auswahl des Handys öffnet. */
export function oeffnetTastatur(tag: string, typ: string): boolean {
	if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
	return tag === 'INPUT' && !OHNE_TASTATUR.has(typ);
}

/** Das nächste Feld nach `aktuell`, das eine Tastatur öffnet; im letzten keines (dann «Fertig»). */
export function naechstesFeld<T>(
	felder: readonly T[],
	aktuell: T,
	mitTastatur: (feld: T) => boolean
): T | null {
	const ab = felder.indexOf(aktuell);
	if (ab < 0) return null;
	return felder.slice(ab + 1).find(mitTastatur) ?? null;
}

type Feld = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function istFeld(el: unknown): el is Feld {
	if (!(
		el instanceof HTMLInputElement ||
		el instanceof HTMLTextAreaElement ||
		el instanceof HTMLSelectElement
	)) {
		return false;
	}
	if (el.disabled || (!(el instanceof HTMLSelectElement) && el.readOnly)) return false;
	return oeffnetTastatur(el.tagName, el.type);
}

function folgeFeld(feld: Feld): Feld | null {
	const formular = feld.form;
	if (!formular) return null;
	return naechstesFeld<unknown>([...formular.elements], feld, istFeld) as Feld | null;
}

/** Hängt das Verhalten an das Dokument; gibt die Funktion zum Abhängen zurück. */
export function beobachteTastatur(): () => void {
	const wurzel = document.documentElement;
	const sicht = window.visualViewport;
	const finger = matchMedia('(pointer: coarse)');
	const ruhig = matchMedia('(prefers-reduced-motion: reduce)');

	function fokusRein(ereignis: FocusEvent) {
		const feld = ereignis.target;
		if (!istFeld(feld)) return;
		if (finger.matches) wurzel.dataset.tastatur = '';
		// Beschriftung der Eingabetaste: «Weiter» oder im letzten Feld «Fertig». Als Attribut, weil
		// nicht jedes WebKit die Eigenschaft `enterKeyHint` kennt (z. B. unter Linux in der CI).
		if (feld instanceof HTMLInputElement) {
			feld.setAttribute('enterkeyhint', folgeFeld(feld) ? 'next' : 'done');
		}
	}

	function schliesse() {
		if (istFeld(document.activeElement)) return;
		delete wurzel.dataset.tastatur;
		wurzel.style.removeProperty('--hoehe-sichtbar');
	}

	// Verlässt ein Tipp (z. B. auf «Speichern») das Feld, kommen die Reiter erst nach dem Tipp
	// zurück. Sonst verschiebt sich die Taste unter dem Finger, und der Klick geht ins Leere.
	let gedrueckt = false;
	let wartet = false;
	const runter = () => {
		gedrueckt = true;
	};
	function hoch() {
		gedrueckt = false;
		if (!wartet) return;
		wartet = false;
		setTimeout(schliesse);
	}

	function fokusRaus(ereignis: FocusEvent) {
		if (istFeld(ereignis.relatedTarget)) return;
		if (gedrueckt) wartet = true;
		else schliesse();
	}

	function taste(ereignis: KeyboardEvent) {
		// Nur per Finger: Am PC (auch in der Verwaltung) sendet die Eingabetaste wie gewohnt ab.
		if (ereignis.key !== 'Enter' || ereignis.isComposing || !finger.matches) return;
		if (ereignis.shiftKey || ereignis.altKey || ereignis.ctrlKey || ereignis.metaKey) return;
		const feld = ereignis.target;
		if (!(feld instanceof HTMLInputElement) || !istFeld(feld)) return;
		const weiter = folgeFeld(feld);
		// Im letzten Feld sendet der Browser das Formular ab.
		if (!weiter) return;
		ereignis.preventDefault();
		weiter.focus();
	}

	// Nur mit offener Tastatur und ohne Zoom mit zwei Fingern (der verschiebt den Ausschnitt zu Recht).
	const tastaturOffen = () => sicht !== null && 'tastatur' in wurzel.dataset && sicht.scale <= 1;

	function seiteZurueck() {
		if (tastaturOffen() && window.scrollY !== 0) window.scrollTo(0, 0);
	}

	// Einmal je Öffnen oder Grössenwechsel der Tastatur, nicht bei jedem Scrollen.
	function sichtGeaendert() {
		if (!sicht || !tastaturOffen()) return;
		wurzel.style.setProperty('--hoehe-sichtbar', `${sicht.height}px`);
		seiteZurueck();
		const feld = document.activeElement;
		if (!istFeld(feld)) return;
		(feld.closest('.feld') ?? feld).scrollIntoView({
			block: 'nearest',
			behavior: ruhig.matches ? 'auto' : 'smooth'
		});
	}

	document.addEventListener('focusin', fokusRein);
	document.addEventListener('focusout', fokusRaus);
	document.addEventListener('keydown', taste);
	document.addEventListener('pointerdown', runter, true);
	document.addEventListener('pointerup', hoch, true);
	document.addEventListener('pointercancel', hoch, true);
	sicht?.addEventListener('resize', sichtGeaendert);
	sicht?.addEventListener('scroll', seiteZurueck);
	return () => {
		document.removeEventListener('focusin', fokusRein);
		document.removeEventListener('focusout', fokusRaus);
		document.removeEventListener('keydown', taste);
		document.removeEventListener('pointerdown', runter, true);
		document.removeEventListener('pointerup', hoch, true);
		document.removeEventListener('pointercancel', hoch, true);
		sicht?.removeEventListener('resize', sichtGeaendert);
		sicht?.removeEventListener('scroll', seiteZurueck);
	};
}
