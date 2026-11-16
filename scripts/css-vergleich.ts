// Stylesheet-Vergleich: Hilfsbefehl auf Abruf (keine Prüfung, nicht Teil von `make check`).
// Beweis für Schritt 18 der Umbauplanung: Das gebaute CSS vor und nach dem Schnitt von
// `basis.css` ist Zeichen für Zeichen gleich.
//
// Aufruf: node scripts/css-vergleich.ts <vorher> <nachher>   oder   make css-vergleich VORHER=… NACHHER=…
// Exit 0 nur, wenn alles gleich ist; jede Abweichung endet mit Exit 1, falsche Aufrufe mit Exit 2.
//
// Ablauf (ein Ordner, ein Build nach dem anderen, nie zwei Builds gleichzeitig; gleiches `node_modules`):
//   1. Stand vorher bauen:  npm run build
//   2. CSS wegkopieren (der nächste Build leert `.svelte-kit/output/`), ausserhalb des Repos:
//        rm -rf /tmp/mytco-css/vorher && mkdir -p /tmp/mytco-css/vorher
//        cp .svelte-kit/output/client/_app/immutable/assets/*.css /tmp/mytco-css/vorher/
//   3. Änderung machen, nachher bauen, ebenso nach /tmp/mytco-css/nachher kopieren.
//   4. Vergleichen:  make css-vergleich VORHER=/tmp/mytco-css/vorher NACHHER=/tmp/mytco-css/nachher
// Verglichen werden je `*.css` Name und Inhalt (als Bytes); `.br` und `.gz` zählen nicht. Nur die oberste
// Ebene der Ordner zählt: Liegt eine CSS-Datei in einem Unterordner, bricht das Skript ab (Exit 2).
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type Vergleich = { gleich: boolean; meldungen: string[] };

/** `0.DrKJQ_Q0.css` → `0.css`: der Name des Bündels ohne den Hash aus dem Inhalt. */
function stamm(name: string): string {
	return name.replace(/\.[A-Za-z0-9_-]{8}\.css$/, '.css');
}

function hatCssInUnterordner(ordner: string): boolean {
	for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
		if (!eintrag.isDirectory()) continue;
		const unter = join(ordner, eintrag.name);
		if (readdirSync(unter).some((n) => n.endsWith('.css')) || hatCssInUnterordner(unter))
			return true;
	}
	return false;
}

function leseCss(ordner: string): Map<string, Buffer> {
	if (!existsSync(ordner) || !statSync(ordner).isDirectory()) {
		throw new Error(`Ordner nicht gefunden: ${ordner}`);
	}
	if (hatCssInUnterordner(ordner)) {
		throw new Error(
			`CSS-Datei in einem Unterordner von ${ordner}: nur die oberste Ebene wird verglichen`
		);
	}
	const dateien = new Map<string, Buffer>();
	for (const name of readdirSync(ordner).sort()) {
		if (!name.endsWith('.css')) continue;
		dateien.set(name, readFileSync(join(ordner, name)));
	}
	if (dateien.size === 0) throw new Error(`keine CSS-Datei in ${ordner}`);
	return dateien;
}

/** Erste abweichende Stelle (Zeichen ab 1) mit etwas Umgebung. */
function ersteAbweichung(vorherBytes: Buffer, nachherBytes: Buffer): string {
	const vorher = vorherBytes.toString('utf-8');
	const nachher = nachherBytes.toString('utf-8');
	let b = 0;
	while (b < vorherBytes.length && b < nachherBytes.length && vorherBytes[b] === nachherBytes[b])
		b++;
	let i = 0;
	while (i < vorher.length && i < nachher.length && vorher[i] === nachher[i]) i++;
	const auszug = (text: string) => JSON.stringify(text.slice(Math.max(0, i - 20), i + 40));
	return `erste Abweichung bei Zeichen ${i + 1} (Byte ${b + 1}, Länge ${vorherBytes.length} → ${nachherBytes.length})\n    vorher:  ${auszug(vorher)}\n    nachher: ${auszug(nachher)}`;
}

export function vergleicheOrdner(vorherOrdner: string, nachherOrdner: string): Vergleich {
	if (existsSync(vorherOrdner) && existsSync(nachherOrdner)) {
		if (realpathSync(vorherOrdner) === realpathSync(nachherOrdner)) {
			throw new Error(`beide Argumente sind derselbe Ordner: ${vorherOrdner}`);
		}
	}
	const vorher = leseCss(vorherOrdner);
	const nachher = leseCss(nachherOrdner);
	const meldungen: string[] = [];
	const nachherUebrig = new Set(nachher.keys());
	const ohneGegenstueck: string[] = [];

	for (const [name, inhalt] of vorher) {
		const gegenInhalt = nachher.get(name);
		if (gegenInhalt !== undefined) {
			nachherUebrig.delete(name);
			if (!gegenInhalt.equals(inhalt)) {
				meldungen.push(`Inhalt anders: ${name}: ${ersteAbweichung(inhalt, gegenInhalt)}`);
			}
		} else ohneGegenstueck.push(name);
	}

	// Anderer Dateiname: nach dem Namen ohne Hash zuordnen, damit klar ist, was sich geändert hat.
	for (const name of ohneGegenstueck) {
		const kandidaten = [...nachherUebrig].filter((n) => stamm(n) === stamm(name));
		if (kandidaten.length !== 1) {
			meldungen.push(`fehlt nachher: ${name}`);
			continue;
		}
		const neu = kandidaten[0];
		nachherUebrig.delete(neu);
		const alt = vorher.get(name) as Buffer;
		const gegen = nachher.get(neu) as Buffer;
		if (alt.equals(gegen)) {
			meldungen.push(`nur der Dateiname anders, Inhalt gleich: ${name} → ${neu}`);
		} else {
			meldungen.push(`Inhalt anders: ${name} → ${neu}: ${ersteAbweichung(alt, gegen)}`);
		}
	}
	for (const name of nachherUebrig) meldungen.push(`neu nachher: ${name}`);

	if (meldungen.length === 0) {
		return { gleich: true, meldungen: [`gleich: ${vorher.size} CSS-Datei(en), Namen und Inhalt`] };
	}
	return { gleich: false, meldungen };
}

if (import.meta.main) {
	const [vorher, nachher] = process.argv.slice(2);
	if (!vorher || !nachher) {
		console.error('Aufruf: node scripts/css-vergleich.ts <vorher> <nachher>');
		process.exit(2);
	}
	try {
		const ergebnis = vergleicheOrdner(vorher, nachher);
		for (const m of ergebnis.meldungen) console.log(m);
		process.exit(ergebnis.gleich ? 0 : 1);
	} catch (fehler) {
		console.error((fehler as Error).message);
		process.exit(2);
	}
}
