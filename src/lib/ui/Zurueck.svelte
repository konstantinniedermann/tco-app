<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { elternVon } from './navigation.ts';

	// Baustein Zurück (UI-Leitbild): «‹ <Titel der Elternseite>», eine Stufe höher in der festen
	// Ordnung, egal woher man kam. `text` setzt den Namen, wo ihn nur die Seite kennt (z. B. die
	// CM); `href` und `onclick` nur für Formularschritte («‹ Andere Adresse»).
	let { text, href, onclick }: { text?: string; href?: string; onclick?: (e: MouseEvent) => void } =
		$props();

	const eltern = $derived(
		elternVon(page.route.id, {
			angemeldet: page.data.angemeldet !== false,
			bereichsWurzel: page.data.bereichsWurzel === true
		})
	);
	const ziel = $derived(
		href ??
			(eltern
				? // Die Elternseite steht nur als Zeichenkette in der festen Ordnung; ihre Parameter
					// sind eine Teilmenge der eigenen (z. B. `id` der CM auf der Doppel-Seite).
					resolve(...([eltern.route, page.params] as Parameters<typeof resolve>))
				: undefined)
	);
	const beschriftung = $derived(text ?? eltern?.text ?? null);
</script>

{#if ziel && beschriftung}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- ziel ist schon aufgelöst -->
	<a class="zurueck" href={ziel} {onclick}>‹ {beschriftung}</a>
{/if}
