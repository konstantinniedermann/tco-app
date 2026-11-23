// Die zwei erfundenen Prüfkonten des Prüflaufs gegen Test (make test-pruefung), ohne Abhängigkeiten:
// Der Server-Teil legt sie an, der Browser-Teil meldet sich mit ihnen an (DS-08, example.org).
export const PRUEFKONTEN = [
	{ vorname: 'Paul', nachname: 'Prüflauf', email: 'paul.pruefung@example.org' },
	{ vorname: 'Pia', nachname: 'Prüflauf', email: 'pia.pruefung@example.org' }
] as const;
