// Symbole für die Anleitung im Brief (Baustein «Symbol» im UI-Leitbild): 24er-Raster,
// Strich 2, Farbe nur über currentColor, immer zusammen mit Text (UI-05).

function symbol(inhalt: string): string {
	return (
		'<svg class="symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
		'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
		inhalt +
		'</svg>'
	);
}

/** Teilen-Symbol von Safari: Kasten, oben offen, mit Pfeil nach oben. */
export const SYMBOL_TEILEN = symbol(
	'<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/>' +
		'<path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2"/>'
);

/** Drei-Punkte-Menü von Chrome (senkrecht). */
export const SYMBOL_MENUE = symbol(
	'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>'
);
