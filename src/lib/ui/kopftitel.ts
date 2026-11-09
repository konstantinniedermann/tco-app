// Titel in der Kopfleiste (UI-Leitbild, «Titel in der Kopfleiste»): Verschwindet das <h1> der
// Seite beim Scrollen oben aus dem Bild, zeigt die Kopfleiste seinen Text.

/**
 * Beobachtet das <h1> in `inhalt` (auch wenn es ausgetauscht wird) und meldet seinen Text,
 * solange es nicht im sichtbaren Teil von `wurzel` liegt (null = Fenster), abzüglich `oben` px
 * (Höhe einer klebenden Kopfleiste). Meldet null, sobald es wieder sichtbar ist oder fehlt.
 * Gibt eine Funktion zum Aufräumen zurück.
 */
export function beobachteKopftitel(o: {
	inhalt: HTMLElement;
	wurzel: HTMLElement | null;
	oben: () => number;
	melde: (titel: string | null) => void;
}): () => void {
	let ueberschrift: HTMLHeadingElement | null = null;
	// Ob das <h1> oberhalb des sichtbaren Teils liegt (unterhalb zeigt die Kopfleiste nichts).
	let darueber = false;
	let beobachter: IntersectionObserver | null = null;

	function melden() {
		o.melde(darueber && ueberschrift ? (ueberschrift.textContent ?? '').trim() : null);
	}

	function beobachte() {
		beobachter?.disconnect();
		beobachter = null;
		if (!ueberschrift) {
			darueber = false;
			melden();
			return;
		}
		beobachter = new IntersectionObserver(
			(eintraege) => {
				const e = eintraege[eintraege.length - 1];
				const grenze = e.rootBounds?.top ?? 0;
				darueber = !e.isIntersecting && e.boundingClientRect.bottom <= grenze;
				melden();
			},
			{ root: o.wurzel, rootMargin: `-${Math.max(0, o.oben())}px 0px 0px 0px`, threshold: 0 }
		);
		beobachter.observe(ueberschrift);
	}

	// Das <h1> kann mit dem Inhalt der Seite wechseln (Schritte eines Ablaufs): neues <h1> beobachten.
	// `darueber` bleibt dabei stehen, damit der Titel nicht aus- und wieder einblendet; die erste
	// Meldung des neuen <h1> korrigiert es.
	function pruefe() {
		const neu = o.inhalt.querySelector('h1');
		if (neu !== ueberschrift) {
			ueberschrift = neu;
			beobachte();
		} else melden();
	}

	const mutationen = new MutationObserver(pruefe);
	mutationen.observe(o.inhalt, { childList: true, subtree: true, characterData: true });
	pruefe();

	return () => {
		mutationen.disconnect();
		beobachter?.disconnect();
	};
}
