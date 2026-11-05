// Weiches Auf- und Zuklappen der Aufklappbereiche (UI-Leitbild, Baustein Aufklappbereich, UI-09).
// Per Skript, weil Safari die Höhe auf `auto` nicht per CSS animiert. Ein Klick-Empfänger auf
// dem Dokument (+layout.svelte) gilt für jede `details.klappe`; Tastatur (Enter, Leertaste)
// löst denselben Klick aus. Bei «Bewegung reduzieren» klappt der Browser wie gewohnt sofort.

type Lauf = { animation: Animation | null; oeffnet: boolean };

const laeufe = new WeakMap<HTMLDetailsElement, Lauf>();

/** Dauer eines Tokens wie `250ms` oder `0.25s` in Millisekunden; unbekannt → 0. */
export function millisekunden(wert: string): number {
	const treffer = /^\s*(\d*\.?\d+)\s*(ms|s)\s*$/.exec(wert);
	if (!treffer) return 0;
	return Number(treffer[1]) * (treffer[2] === 's' ? 1000 : 1);
}

function token(name: string): string {
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const hoehe = (el: Element) => el.getBoundingClientRect().height;

/** Höhe der geschlossenen Klappe: Titelzeile plus Innenabstand und Rand des Bereichs. */
function geschlossen(klappe: HTMLDetailsElement, titel: HTMLElement): number {
	const s = getComputedStyle(klappe);
	return (
		hoehe(titel) +
		parseFloat(s.paddingTop) +
		parseFloat(s.paddingBottom) +
		parseFloat(s.borderTopWidth) +
		parseFloat(s.borderBottomWidth)
	);
}

function bewege(klappe: HTMLDetailsElement, von: number, bis: number, oeffnet: boolean): void {
	const animation = klappe.animate([{ height: `${von}px` }, { height: `${bis}px` }], {
		duration: millisekunden(token('--dauer-mittel')),
		easing: token('--kurve-standard') || 'ease'
	});
	klappe.style.height = '';
	const lauf: Lauf = { animation, oeffnet };
	laeufe.set(klappe, lauf);
	animation.onfinish = () => {
		if (laeufe.get(klappe) !== lauf) return;
		laeufe.delete(klappe);
		if (!oeffnet) klappe.open = false;
		klappe.classList.remove('klappe-bewegt');
	};
}

/** Klick-Empfänger: Klick auf die Titelzeile einer `details.klappe` klappt weich auf oder zu. */
export function klappeWeich(ereignis: MouseEvent): void {
	const ziel = ereignis.target instanceof Element ? ereignis.target : null;
	const titel = ziel?.closest('summary');
	const klappe = titel?.parentElement;
	if (!titel || !(klappe instanceof HTMLDetailsElement) || !klappe.classList.contains('klappe')) {
		return;
	}
	if (klappe.querySelector(':scope > summary') !== titel) return;
	if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('animate' in klappe)) return;

	ereignis.preventDefault();
	const vorher = laeufe.get(klappe);
	const start = hoehe(klappe);
	vorher?.animation?.cancel();
	const oeffnen = vorher ? !vorher.oeffnet : !klappe.open;

	// Höhe festhalten, damit beim Öffnen nichts aufblitzt, bevor die Bewegung beginnt.
	klappe.classList.add('klappe-bewegt');
	klappe.style.height = `${start}px`;

	if (!oeffnen) {
		bewege(klappe, start, geschlossen(klappe, titel), false);
		return;
	}
	const lauf: Lauf = { animation: null, oeffnet: true };
	laeufe.set(klappe, lauf);
	klappe.open = true;
	// Zwei Bilder warten: Inhalte, die erst beim Öffnen erscheinen (`{#if offen}`), sind dann da.
	requestAnimationFrame(() =>
		requestAnimationFrame(() => {
			if (laeufe.get(klappe) !== lauf) return;
			klappe.style.height = '';
			const bis = hoehe(klappe);
			klappe.style.height = `${start}px`;
			bewege(klappe, start, bis, true);
		})
	);
}
