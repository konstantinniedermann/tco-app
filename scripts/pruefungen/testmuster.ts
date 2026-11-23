// Welche Dateien die Testprogramme ausführen. vitest.config.ts liest EINHEIT und DATENBANK,
// die Prüfung test-ids alle; playwright.config.ts (testDir + testMatch) entspricht E2E,
// playwright.test-server.config.ts entspricht TESTSERVER.
export type Testmuster = { include: string[]; exclude: string[] };

export const EINHEIT: Testmuster = {
	include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
	exclude: ['**/*.db.test.ts', 'tests/e2e/**', 'tests/test-server/**']
};

export const DATENBANK: Testmuster = {
	include: ['src/**/*.db.test.ts', 'tests/**/*.db.test.ts'],
	exclude: ['tests/e2e/**', 'tests/test-server/**']
};

export const E2E: Testmuster = {
	include: ['tests/e2e/**/*.test.ts'],
	exclude: []
};

// Prüflauf gegen den echten Test-Server: startet nur `make test-pruefung` vor dem Release, nie
// make check, E2E oder die CI. Deckt darum keine ID ab (Prüfung test-ids).
export const TESTSERVER: Testmuster = {
	include: ['tests/test-server/**/*.test.ts'],
	exclude: []
};
