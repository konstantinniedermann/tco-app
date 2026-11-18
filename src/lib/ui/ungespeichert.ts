// Ungespeicherte Änderungen (UI-Leitbild, Abschnitt «Ungespeicherte Änderungen»): Wer ein
// Formular geändert hat und die Seite über einen Link der App verlässt, bekommt zuerst die
// Rückfrage «Nicht gespeichert – trotzdem verlassen?». Das Formular trägt `data-ungespeichert`,
// solange ein Feld vom geladenen Stand abweicht; die Rückfrage selbst steht im Layout.
//
// Nur Links fragen: Wechsel der App selbst (`goto`, z. B. nach dem Speichern) nicht, die
// Zurück-Geste (`popstate`) nicht, weil der Browser die vorige Seite schon zeigt, und das
// Verlassen der App (`leave`, Links hinaus) nicht, weil dort nur der Dialog des Browsers ginge.
// Ein Link der App, der nach einer neuen Auslieferung die Seite ganz neu lädt (`neuLaden`, E-65),
// fragt dagegen: Die Seite entlädt zwar, aber das Ziel liegt in der App.

type Wechsel = { type: string; willUnload: boolean };

/** Ob ein Wechsel zuerst die Rückfrage zeigt. */
export function fragtVorWechsel(
	wechsel: Wechsel,
	ungespeichert: boolean,
	neuLaden = false
): boolean {
	return ungespeichert && wechsel.type === 'link' && (!wechsel.willUnload || neuLaden);
}

/** Ob auf der Seite ein Formular mit ungespeicherten Änderungen steht. */
export function hatUngespeichertes(wurzel: Pick<ParentNode, 'querySelector'>): boolean {
	return wurzel.querySelector('[data-ungespeichert]') !== null;
}
