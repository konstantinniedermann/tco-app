// Liest die Datenschutzerklärung aus docs/datenschutzerklaerung.md, damit App und Doku denselben
// Text zeigen (DS-09). Nur das, was die Datei braucht: Absätze, Listen mit «- », **fett**.
// Kein HTML: Die Seite setzt die Teile als Text ein.

export type Teil = { text: string; fett: boolean };
export type Block = { art: 'absatz'; teile: Teil[] } | { art: 'liste'; punkte: Teil[][] };
export type Erklaerung = { titel: string; bloecke: Block[] };

function teile(text: string): Teil[] {
	return text
		.split(/(\*\*[^*]+\*\*)/)
		.filter((stueck) => stueck !== '')
		.map((stueck) =>
			stueck.startsWith('**') && stueck.endsWith('**')
				? { text: stueck.slice(2, -2), fett: true }
				: { text: stueck, fett: false }
		);
}

export function leseErklaerung(markdown: string): Erklaerung {
	const zeilen = markdown.split('\n');
	const trenner = zeilen.findIndex((z) => z.trim() === '---');
	const rest = trenner === -1 ? [] : zeilen.slice(trenner + 1);
	const titelZeile = rest.findIndex((z) => z.startsWith('## '));
	if (titelZeile === -1) throw new Error('Datenschutzerklärung ohne Titel');
	const titel = rest[titelZeile].slice(3).trim();

	const bloecke: Block[] = [];
	let absatz: string[] = [];
	let punkte: string[] = [];
	const schliesse = () => {
		if (absatz.length) bloecke.push({ art: 'absatz', teile: teile(absatz.join(' ')) });
		if (punkte.length) bloecke.push({ art: 'liste', punkte: punkte.map(teile) });
		absatz = [];
		punkte = [];
	};
	for (const zeile of rest.slice(titelZeile + 1)) {
		const z = zeile.trim();
		if (z === '') {
			schliesse();
		} else if (z.startsWith('- ')) {
			if (absatz.length) schliesse();
			punkte.push(z.slice(2));
		} else if (punkte.length) {
			punkte[punkte.length - 1] += ` ${z}`;
		} else {
			absatz.push(z);
		}
	}
	schliesse();
	return { titel, bloecke };
}
