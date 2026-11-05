// Nummer aus der Adresse (`/…/[id]`) prüfen; gemeinsam für Admin- und Mitglieder-Schnittstellen.
const INTEGER_MAX = 2_147_483_647;

export function parseId(roh: string | null | undefined): number | null {
	if (roh === null || roh === undefined || !/^[1-9]\d{0,14}$/.test(roh)) return null;
	const n = Number(roh);
	// Grösser als ein Postgres-integer würde die Abfrage mit 22003 abbrechen (500).
	return n <= INTEGER_MAX ? n : null;
}
