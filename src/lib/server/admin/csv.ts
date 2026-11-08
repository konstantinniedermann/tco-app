// CSV nach RFC 4180 für das Einlesen von Mitgliedern (A-MITGLIED-07), ohne Abhängigkeit. Der Text
// lebt nur im Arbeitsspeicher und wird nie geloggt (SI-05).

/** `nummer`: Zeile in der Datei, in der der Datensatz beginnt; die Kopfzeile ist 1. */
export type CsvZeile = { nummer: number; felder: string[] };

export type CsvErgebnis =
	| { ok: true; kopf: string[]; zeilen: CsvZeile[] }
	| { ok: false; grund: 'leer' | 'anfuehrungszeichen' };

/** `;`, wenn die erste Zeile ausserhalb von Anführungszeichen mehr `;` als `,` hat, sonst `,`. */
function trennzeichen(text: string): ';' | ',' {
	let semikolon = 0;
	let komma = 0;
	let inZitat = false;
	for (const z of text) {
		if (z === '"') inZitat = !inZitat;
		else if (!inZitat && (z === '\n' || z === '\r')) break;
		else if (!inZitat && z === ';') semikolon++;
		else if (!inZitat && z === ',') komma++;
	}
	return semikolon > komma ? ';' : ',';
}

export function leseCsv(text: string): CsvErgebnis {
	const inhalt = text.startsWith('\uFEFF') ? text.slice(1) : text;
	if (inhalt.trim() === '') return { ok: false, grund: 'leer' };
	const trenn = trennzeichen(inhalt);

	const saetze: CsvZeile[] = [];
	let felder: string[] = [];
	let feld = '';
	let inZitat = false;
	let zeile = 1;
	let beginn = 1;

	const feldEnde = () => {
		felder.push(feld);
		feld = '';
	};
	const satzEnde = () => {
		feldEnde();
		saetze.push({ nummer: beginn, felder });
		felder = [];
	};

	for (let i = 0; i < inhalt.length; i++) {
		const z = inhalt[i];
		if (inZitat) {
			if (z === '"') {
				if (inhalt[i + 1] === '"') {
					feld += '"';
					i++;
				} else inZitat = false;
			} else {
				if (z === '\n' || (z === '\r' && inhalt[i + 1] !== '\n')) zeile++;
				feld += z;
			}
		} else if (z === '"') inZitat = true;
		else if (z === trenn) feldEnde();
		else if (z === '\r' || z === '\n') {
			if (z === '\r' && inhalt[i + 1] === '\n') i++;
			satzEnde();
			zeile++;
			beginn = zeile;
		} else feld += z;
	}
	if (inZitat) return { ok: false, grund: 'anfuehrungszeichen' };
	if (feld !== '' || felder.length > 0) satzEnde();

	const belegt = saetze.filter((s) => s.felder.some((f) => f.trim() !== ''));
	if (belegt.length === 0) return { ok: false, grund: 'leer' };
	const [kopf, ...zeilen] = belegt;
	return { ok: true, kopf: kopf.felder.map((f) => f.trim().toLowerCase()), zeilen };
}
