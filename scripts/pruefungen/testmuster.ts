// Welche Dateien die Testprogramme ausführen. vitest.config.ts liest EINHEIT und DATENBANK,
// die Prüfung test-ids alle drei; playwright.config.ts (testDir + testMatch) entspricht E2E.
export type Testmuster = { include: string[]; exclude: string[] };

export const EINHEIT: Testmuster = {
	include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
	exclude: ['**/*.db.test.ts', 'tests/e2e/**']
};

export const DATENBANK: Testmuster = {
	include: ['src/**/*.db.test.ts', 'tests/**/*.db.test.ts'],
	exclude: ['tests/e2e/**']
};

export const E2E: Testmuster = {
	include: ['tests/e2e/**/*.test.ts'],
	exclude: []
};
