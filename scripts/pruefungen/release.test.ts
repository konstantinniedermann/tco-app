import { describe, expect, it } from 'vitest';
import { pruefeRelease, versionsabschnitte } from './release.ts';

const KOPF = '# Versionen\n\nEinleitung.\n\n';

function versionen(...abschnitte: string[]): string {
	return KOPF + abschnitte.join('\n\n') + '\n';
}

const UNVEROEFFENTLICHT_LEER = '## Unveröffentlicht';
const V020_NICHT = '## 0.2.0 — Login, nicht ausgeliefert\n\n- Login.';
const V010_NICHT = '## 0.1.0 — Gerüst, nicht ausgeliefert\n\n- Gerüst.';
const VOR_010 = '## Doku-Stände vor 0.1.0\n\n- Repo aufgesetzt.';

describe('versionsabschnitte', () => {
	it('liest Version und Marker aus den Überschriften, andere Abschnitte zählen nicht', () => {
		const md = versionen(UNVEROEFFENTLICHT_LEER, V020_NICHT, '## 0.1.0 — Gerüst', VOR_010);
		expect(versionsabschnitte(md)).toEqual([
			{ version: '0.2.0', nichtAusgeliefert: true, zeile: 7 },
			{ version: '0.1.0', nichtAusgeliefert: false, zeile: 11 }
		]);
	});

	it('übergeht Überschriften in Codeblöcken', () => {
		const md = versionen(UNVEROEFFENTLICHT_LEER, '```\n## 9.9.9\n```', V010_NICHT);
		expect(versionsabschnitte(md).map((a) => a.version)).toEqual(['0.1.0']);
	});
});

describe('pruefeRelease', () => {
	const sauber = {
		version: '0.2.0',
		versionMain: '0.1.0',
		versionen: versionen(UNVEROEFFENTLICHT_LEER, V020_NICHT, V010_NICHT, VOR_010),
		tags: [],
		nurDoku: false
	};

	it('meldet nichts bei einem stimmigen Stand', () => {
		expect(pruefeRelease(sauber)).toEqual([]);
	});

	it('verlangt einen Abschnitt für die Version aus package.json', () => {
		const befunde = pruefeRelease({ ...sauber, version: '0.3.0' });
		expect(befunde).toEqual([expect.stringContaining('Kein Abschnitt «## 0.3.0')]);
	});

	it('meldet eine Version mit zwei Abschnitten', () => {
		const md = versionen(UNVEROEFFENTLICHT_LEER, V020_NICHT, V020_NICHT, V010_NICHT);
		expect(pruefeRelease({ ...sauber, versionen: md })).toEqual([
			expect.stringContaining('0.2.0 hat 2 Abschnitte')
		]);
	});

	it('verlangt nach erhöhter Version ein leeres «Unveröffentlicht»', () => {
		const md = versionen('## Unveröffentlicht\n\n- Liegengeblieben.', V020_NICHT, V010_NICHT);
		expect(pruefeRelease({ ...sauber, versionen: md })).toEqual([
			expect.stringContaining('«Unveröffentlicht» ist nicht leer')
		]);
	});

	it('lässt «Unveröffentlicht» stehen, wenn die Version gleich bleibt (Release nur Doku)', () => {
		const md = versionen('## Unveröffentlicht\n\n- Doku.', V020_NICHT, V010_NICHT);
		expect(
			pruefeRelease({ ...sauber, versionMain: '0.2.0', versionen: md, nurDoku: true })
		).toEqual([]);
	});

	it('verlangt eine höhere Version, sobald das Release Code enthält', () => {
		expect(pruefeRelease({ ...sauber, versionMain: '0.2.0' })).toEqual([
			expect.stringContaining('Release enthält Code, aber die Version bleibt 0.2.0 — beim Merge')
		]);
	});

	it('meldet eine Version, die gegenüber main sinkt', () => {
		expect(pruefeRelease({ ...sauber, versionMain: '0.10.0', nurDoku: true })).toEqual([
			expect.stringContaining('Version sinkt von 0.10.0 auf 0.2.0')
		]);
	});

	it('verlangt den Abschnitt «Unveröffentlicht»', () => {
		const md = versionen(V020_NICHT, V010_NICHT);
		expect(pruefeRelease({ ...sauber, versionen: md })).toEqual([
			expect.stringContaining('Abschnitt «## Unveröffentlicht» fehlt')
		]);
	});

	it('meldet einen Tag zu einer Version, die als «nicht ausgeliefert» markiert ist', () => {
		expect(pruefeRelease({ ...sauber, tags: ['v0.1.0'] })).toEqual([
			expect.stringContaining('0.1.0 ist als «nicht ausgeliefert» markiert, aber Tag v0.1.0')
		]);
	});

	it('lässt Zwischenstände ohne Tag und ohne Marker zu (jeder Merge nach dev hat seine Nummer)', () => {
		const md = versionen(
			UNVEROEFFENTLICHT_LEER,
			'## 0.2.1 — Korrektur\n\n- Fix.',
			'## 0.2.0 — Login\n\n- Login.',
			V010_NICHT
		);
		expect(pruefeRelease({ ...sauber, version: '0.2.1', versionen: md, tags: [] })).toEqual([]);
	});

	it('verlangt, dass der oberste Versionsabschnitt die Version aus package.json ist', () => {
		const md = versionen(UNVEROEFFENTLICHT_LEER, '## 0.2.1 — Neuer', V020_NICHT, V010_NICHT);
		expect(pruefeRelease({ ...sauber, versionen: md })).toEqual([
			expect.stringContaining('oberste Version ist 0.2.1, package.json sagt 0.2.0')
		]);
	});

	it('meldet einen Tag ohne Abschnitt', () => {
		expect(pruefeRelease({ ...sauber, tags: ['v0.0.9'] })).toEqual([
			expect.stringContaining('Tag v0.0.9 hat keinen Abschnitt')
		]);
	});

	it('übergeht Tags, die keine Version sind', () => {
		expect(pruefeRelease({ ...sauber, tags: ['code-abc', 'v1'] })).toEqual([]);
	});
});
