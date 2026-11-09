// Aktionen einer Tabellenzeile der Verwaltung (UI-Leitbild, Baustein Tabelle und Ändern-Dialog).

/** Eine Aktion der Zeile: Name der Taste und was sie öffnet (meist den Dialog der Aktion). */
export type Zeilenaktion = { name: string; los: () => void };

/** Ab so vielen Aktionen steht in der Zeile nur noch die Taste «Ändern». */
export const AENDERN_AB = 3;

/** Ab drei Aktionen steht in der Zeile nur «Ändern» (UI-Leitbild, Tabelle). */
export function zeigtAendern(anzahl: number): boolean {
	return anzahl >= AENDERN_AB;
}
