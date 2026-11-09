// Titel in der Kopfleiste (UI-Leitbild, «Titel in der Kopfleiste»): Verschwindet das <h1> der
// Seite beim Scrollen oben aus dem Bild, zeigt die Kopfleiste seinen Text.

/**
 * Beobachtet das <h1> in `inhalt` (auch wenn es ausgetauscht wird) und meldet seinen Text,
 * solange es nicht im sichtbaren Teil von `wurzel` liegt (null = Fenster), abzüglich `oben` px
 * (Höhe einer klebenden Kopfleiste). Meldet null, sobald es wieder sichtbar ist oder fehlt.
 * `oben` wird beim Aufbau gelesen und danach bei jedem Fenster- und `inhalt`-Grössenwechsel
 * erneut; ändert sich der Wert, wird der Beobachter mit dem neuen Rand neu aufgebaut.
 * Beim Scrollen von `wurzel` (bzw. des Fensters) prüft er zusätzlich selbst nach.
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
	let rand = Math.max(0, o.oben());

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
			{ root: o.wurzel, rootMargin: `-${rand}px 0px 0px 0px`, threshold: 0 }
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

	// Ändert sich die Höhe der klebenden Kopfleiste (Fenster gedreht, Schrift grösser), braucht der
	// Beobachter den neuen Rand.
	function pruefeRand() {
		const neu = Math.max(0, o.oben());
		if (neu === rand) return;
		rand = neu;
		beobachte();
	}
	const groesse = new ResizeObserver(pruefeRand);
	groesse.observe(o.inhalt);
	window.addEventListener('resize', pruefeRand);

	// Der IntersectionObserver meldet nur den Wechsel zwischen «im Bild» und «nicht im Bild».
	// Springt die Seite vom <h1> unterhalb des Bildes direkt über es hinaus (Taste Ende, schnelles
	// Wischen; in der Verwaltung auf dem Handy steht die Seitenleiste über dem Inhalt), bliebe er
	// stumm. Darum prüft auch Scrollen nach, einmal pro Bild wie der Beobachter selbst (ein Skript,
	// das kurz hin und zurück scrollt, lässt den Titel so in Ruhe).
	let bild = 0;
	function nachScrollen() {
		if (bild) return;
		bild = requestAnimationFrame(() => {
			bild = 0;
			if (!ueberschrift) return;
			const grenze = (o.wurzel ? o.wurzel.getBoundingClientRect().top : 0) + rand;
			const neu = ueberschrift.getBoundingClientRect().bottom <= grenze;
			if (neu === darueber) return;
			darueber = neu;
			melden();
		});
	}
	const scrollt = o.wurzel ?? window;
	scrollt.addEventListener('scroll', nachScrollen, { passive: true });

	const mutationen = new MutationObserver(pruefe);
	mutationen.observe(o.inhalt, { childList: true, subtree: true, characterData: true });
	pruefe();

	return () => {
		mutationen.disconnect();
		groesse.disconnect();
		window.removeEventListener('resize', pruefeRand);
		scrollt.removeEventListener('scroll', nachScrollen);
		cancelAnimationFrame(bild);
		beobachter?.disconnect();
	};
}
