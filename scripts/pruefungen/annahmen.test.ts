import { describe, expect, it } from 'vitest';
import { fragenstand, liste, pruefeAnnahmen, sammleMarkierungen } from './annahmen.ts';

const ABKLAERUNGEN = `# Abklärungen

## Vor Ende Fundament

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-10 | Darf MyTCO unter my.tcolten.ch laufen? | Website-Betreuer | #32 |
| K-11 | Mailversand? | Hoster | #29 |
| K-25 | Kategorien? | CM | Fachmodell |

## Beantwortet

| ID | Frage | Antwort | Von, am | Folgen |
|----|-------|---------|---------|--------|
| K-15 | Erreichbarkeit? | Keine Anforderungen | PL | — |
| K-25.2 | Nenngeld? | Nein | PL | — |
`;

const stand = fragenstand(ABKLAERUNGEN);

function befunde(pfad: string, inhalt: string): string[] {
	return pruefeAnnahmen(sammleMarkierungen(new Map([[pfad, inhalt]])), stand);
}

describe('fragenstand', () => {
	it('trennt offene und beantwortete Fragen', () => {
		expect([...stand.offen].sort()).toEqual(['K-10', 'K-11', 'K-25']);
		expect([...stand.beantwortet].sort()).toEqual(['K-15', 'K-25.2']);
	});
});

describe('sammleMarkierungen', () => {
	it('findet Annahme, Vorschlag und «hängt an» in Doku und Code', () => {
		const m = sammleMarkierungen(
			new Map([
				['docs/a.md', 'Text (Annahme K-10) und **Vorschlag K-11:** mehr'],
				['src/lib/x.ts', '// hängt an K-11 und K-25: Anbieter offen']
			])
		);
		expect(m.map((x) => `${x.pfad}:${x.zeile}:${x.id}`)).toEqual([
			'docs/a.md:1:K-10',
			'docs/a.md:1:K-11',
			'src/lib/x.ts:1:K-11',
			'src/lib/x.ts:1:K-25'
		]);
	});
	it('nimmt Listen nach dem Stichwort mit, auch mit Unterfragen', () => {
		const m = sammleMarkierungen(new Map([['docs/a.md', 'Annahme K-10, K-25.4 und K-11']]));
		expect(m.map((x) => x.id)).toEqual(['K-10', 'K-25.4', 'K-11']);
	});
	it('zählt blosse Verweise ohne Stichwort nicht', () => {
		expect(sammleMarkierungen(new Map([['docs/a.md', 'beantwortet (K-15), siehe K-10']]))).toEqual(
			[]
		);
	});
	it('zählt jeden Verweis im Abschnitt «Offene Fragen»', () => {
		const m = sammleMarkierungen(
			new Map([
				['docs/a.md', '## Offene Fragen an den Verein\n\nK-10 (Adresse), K-15\n\n## Weiter\n\nK-11']
			])
		);
		expect(m.map((x) => `${x.zeile}:${x.id}`)).toEqual(['3:K-10', '3:K-15']);
	});
	it('überspringt Änderungsprotokolle, dort ist alles Historie', () => {
		const inhalt = '## Änderungsprotokoll\n\n| 1 | Vorschlag K-11 |\n\n## Neu\n\nAnnahme K-10';
		expect(sammleMarkierungen(new Map([['docs/a.md', inhalt]])).map((x) => x.id)).toEqual(['K-10']);
	});
	it('ignoriert den Platzhalter K-NN', () => {
		expect(sammleMarkierungen(new Map([['docs/a.md', '**Annahme K-NN** = noch offen']]))).toEqual(
			[]
		);
	});
});

describe('pruefeAnnahmen', () => {
	it('lässt Annahmen zu offenen Fragen durch', () => {
		expect(befunde('docs/a.md', 'Annahme K-10 und Annahme K-25.4')).toEqual([]);
	});
	it('meldet eine Annahme zu einer beantworteten Frage', () => {
		expect(befunde('docs/a.md', 'Annahme K-15: Ausfall egal')).toEqual([
			'docs/a.md:1: K-15 ist beantwortet — Annahme prüfen und auflösen: «Annahme K-15: Ausfall egal»'
		]);
	});
	it('meldet die Unterfrage einer ganz beantworteten Frage', () => {
		expect(befunde('docs/a.md', 'Annahme K-15.1')).toHaveLength(1);
	});
	it('meldet eine Annahme zur ganzen Frage, sobald eine Unterfrage beantwortet ist', () => {
		expect(befunde('docs/a.md', 'Annahme K-25')).toHaveLength(1);
	});
	it('lässt andere Unterfragen derselben Frage durch', () => {
		expect(befunde('docs/a.md', 'Annahme K-25.4')).toEqual([]);
	});
	it('meldet unbekannte Fragen (Tippfehler)', () => {
		expect(befunde('docs/a.md', 'Annahme K-99')).toEqual([
			'docs/a.md:1: K-99 steht nicht in docs/abklaerungen.md'
		]);
	});
});

describe('Schreibweisen', () => {
	const ids = (pfad: string, inhalt: string) =>
		sammleMarkierungen(new Map([[pfad, inhalt]])).map((x) => `${x.zeile}:${x.id}`);
	it('erkennt Zeilenumbrüche nach dem Stichwort und in der Liste', () => {
		expect(ids('docs/a.md', 'Annahme\nK-11')).toEqual(['2:K-11']);
		expect(ids('docs/a.md', 'hängt an K-10, K-25 und\nK-11')).toEqual([
			'1:K-10',
			'1:K-25',
			'2:K-11'
		]);
	});
	it('erkennt Mehrzahl, Fettschrift, Links, Kleinschreibung und Vermutung', () => {
		expect(ids('docs/a.md', 'Annahmen K-27')).toEqual(['1:K-27']);
		expect(ids('docs/a.md', '**Annahme** K-27')).toEqual(['1:K-27']);
		expect(ids('docs/a.md', '*Annahme:* K-27')).toEqual(['1:K-27']);
		expect(ids('docs/a.md', 'Annahme [K-34](abklaerungen.md#x)')).toEqual(['1:K-34']);
		expect(ids('docs/a.md', 'annahme k-34')).toEqual(['1:K-34']);
		expect(ids('docs/a.md', '*Vermutung K-24.1:* gleicher Kalender')).toEqual(['1:K-24.1']);
	});
	it('liest Kommentare in Shell und YAML nicht als Überschrift', () => {
		expect(ids('deploy.sh', '# Annahme K-11: SMTP\n# Änderung: x\n# hängt an K-10')).toEqual([
			'1:K-11',
			'3:K-10'
		]);
	});
	it('ignoriert Überschriften in Codeblöcken', () => {
		expect(ids('docs/a.md', '```sh\n# Änderung\n```\nAnnahme K-10')).toEqual(['4:K-10']);
	});
	it('zählt eine Stelle nur einmal, auch im Abschnitt «Offene Fragen»', () => {
		expect(ids('docs/a.md', '## Offene Fragen\n\nVorschlag K-10')).toEqual(['3:K-10']);
	});
	it('nimmt Unterfragen im Abschnitt «Offene Fragen» mit', () => {
		expect(ids('docs/a.md', '## Offene Fragen\n\nK-16.1 und K-16.3.')).toEqual([
			'3:K-16.1',
			'3:K-16.3'
		]);
	});
});

describe('fragenstand — Format', () => {
	it('meldet Sammelzeilen und «Teil» unter «Beantwortet»', () => {
		const md =
			'## Beantwortet\n\n| ID | Frage |\n|----|----|\n| K-16 (Teil) | x |\n| K-11, K-12 | y |';
		expect(fragenstand(md).fehler).toHaveLength(2);
	});
	it('meldet einen fehlenden Abschnitt «Beantwortet»', () => {
		expect(fragenstand('## Beantwortete Fragen\n\n| K-15 | x |').fehler).toEqual([
			'docs/abklaerungen.md: Abschnitt «## Beantwortet» fehlt'
		]);
	});
	it('gibt Formatfehler als Befund aus', () => {
		expect(pruefeAnnahmen([], fragenstand('## Offen\n\n| K-10 | x |'))).toHaveLength(1);
	});
});

describe('liste', () => {
	const m = sammleMarkierungen(
		new Map([['docs/a.md', 'Annahme K-25\nAnnahme K-25.4\nAnnahme K-25.1\nAnnahme K-11']])
	);
	it('zeigt zur ganzen Frage alle Unterfragen', () => {
		expect(liste(m, 'K-25')).toContain('K-25.1');
		expect(liste(m, 'K-25')).not.toContain('K-11');
	});
	it('zeigt zu einer Unterfrage nur sie und die ganze Frage', () => {
		const text = liste(m, 'k-25.4');
		expect(text).toContain('K-25.4');
		expect(text).toContain('Annahme K-25\n');
		expect(text).not.toContain('K-25.1');
	});
	it('meldet, wenn es keine Annahmen gibt', () => {
		expect(liste(m, 'K-99')).toBe('Keine Annahmen zu K-99.');
		expect(liste([])).toBe('Keine Annahmen.');
	});
});
