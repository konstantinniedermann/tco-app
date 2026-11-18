export const APP_VERSION: string = __APP_VERSION__;
/** Kurzform des Commits, aus dem das Image gebaut ist (CI: Build-Argument MYTCO_COMMIT); lokal leer. */
export const APP_COMMIT: string = __APP_COMMIT__;

/**
 * Text der Fusszeile (ADR-012): Auf Test, erkannt an der Adresse `test.…`, steht hinter der Nummer
 * die Kurzform des Commits, damit sich Stände mit gleicher Nummer unterscheiden lassen. Live zeigt
 * dasselbe Image, aber nur die Nummer.
 */
export function versionsText(version: string, commit: string, hostname: string): string {
	return hostname.startsWith('test.') && commit !== '' ? `${version} · ${commit}` : version;
}
