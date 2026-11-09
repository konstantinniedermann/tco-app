import { describe, expect, test } from 'vitest';
import {
	ANTWORT_TEXT,
	MELDUNG_TITEL,
	NACHRICHT_TEXT,
	pfadMitglied,
	pfadVerwaltung
} from './meldung.ts';

describe('FR-53: Meldungen zum Gespräch (A-TURNIER-04)', () => {
	test('Texte und Pfade wie in der Spec, ohne Namen und ohne Inhalt', () => {
		expect(MELDUNG_TITEL).toBe('Clubmeisterschaft');
		expect(NACHRICHT_TEXT).toBe('Neue Nachricht an die Turnierleitung.');
		expect(ANTWORT_TEXT).toBe('Die Turnierleitung hat dir geantwortet.');
		expect(pfadVerwaltung(4, 9)).toBe('/verwaltung/turniere/4/nachrichten/9');
		expect(pfadMitglied(4)).toBe('/clubmeisterschaft/4/kontakt');
	});
});
