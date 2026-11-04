// Erkennung für die Einstiegsseite (A-HILFE-02). Läuft nur im Browser; das Ergebnis wird weder
// gespeichert noch an den Server geschickt.

export type Geraet = 'iphone' | 'android' | 'andere';

/** iPhone oder Android (auch Tablet). Das iPad gibt sich als Mac aus und zählt zu «andere». */
export function erkenneGeraet(userAgent: string): Geraet {
	if (/iPhone/.test(userAgent)) return 'iphone';
	if (/Android/.test(userAgent)) return 'android';
	return 'andere';
}

/** Chrome, Firefox oder Edge auf dem iPhone: dort gelten die Safari-Schritte nicht. */
export function istAndererIphoneBrowser(userAgent: string): boolean {
	return /CriOS|FxiOS|EdgiOS/.test(userAgent);
}

// `navigator.standalone` kennt nur Safari auf dem iPhone; TypeScript führt es nicht.
type Fenster = {
	matchMedia(abfrage: string): { matches: boolean };
	navigator: object;
};

/** Gestartet über das Symbol auf dem Startbildschirm statt im Browser. */
export function laeuftVomSymbol(fenster: Fenster): boolean {
	return (
		fenster.matchMedia('(display-mode: standalone)').matches ||
		('standalone' in fenster.navigator && fenster.navigator.standalone === true)
	);
}

/** Die Einstiegsseite erscheint nur auf dem Handy im Browser. */
export function zeigeEinstieg(userAgent: string, vomSymbol: boolean): boolean {
	return erkenneGeraet(userAgent) !== 'andere' && !vomSymbol;
}
