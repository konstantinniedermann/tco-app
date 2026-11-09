<!--
	A-ANMELDUNG-06: Suchfeld und Trefferliste der aktiven Mitglieder für das Anmelden von Hand und
	das Ändern eines Doppelpartners. Gewählt wird ein Treffer als Auswahlfläche; eine neue Suche hebt
	die Wahl auf (`onwahl(null)`). Für eine leere Suche setzt die Seite die Komponente neu auf
	(`{#key}`), etwa beim Öffnen ihres Dialogs.
-->
<script lang="ts">
	import Name from '../ui/Name.svelte';
	import { sucheSpieler, type SpielerTreffer } from './api.ts';
	import { fehlerText } from './anzeige.ts';
	import { trefferText } from './turnier-anzeige.ts';
	import { leiteUm } from './umleiten.ts';

	type Props = {
		/** Eindeutiger Vorsatz für die IDs der Felder, wenn ein Dialog zwei Suchen hat. */
		id: string;
		label: string;
		/** Hilfetext unter dem Feld. */
		hilfe?: string;
		/** Titel der Trefferliste; zwei Suchen in einem Dialog brauchen verschiedene. */
		legende?: string;
		/** `mitgliedId` des gewählten Treffers. */
		gewaehlt: number | null;
		/** Grund, warum ein Treffer nicht wählbar ist (z. B. «schon angemeldet»), sonst `null`. */
		gesperrt?: (mitgliedId: number) => string | null;
		onwahl: (t: SpielerTreffer | null) => void;
	};

	let {
		id,
		label,
		hilfe,
		legende = 'Treffer',
		gewaehlt,
		gesperrt = () => null,
		onwahl
	}: Props = $props();

	let suche = $state('');
	let treffer = $state<SpielerTreffer[] | null>(null);
	let fehler = $state<string | null>(null);
	const hatTreffer = $derived(!fehler && treffer !== null && treffer.length > 0);

	// Nur die neueste Suche zählt, wenn mehrere unterwegs sind.
	let abfrage = 0;
	let warten: ReturnType<typeof setTimeout> | undefined;
	// Verschwindet die Suche (z. B. neu aufgesetzt mit `{#key}`), sucht sie nicht mehr.
	$effect(() => () => clearTimeout(warten));

	function setzeSuche(wert: string) {
		suche = wert;
		fehler = null;
		onwahl(null);
		clearTimeout(warten);
		const nr = ++abfrage;
		const text = wert.trim();
		if (text.length < 2) {
			treffer = null;
			return;
		}
		warten = setTimeout(() => suchen(text, nr), 200);
	}

	async function suchen(text: string, nr: number) {
		const a = await sucheSpieler(text);
		if (nr !== abfrage) return;
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			treffer = a.daten;
		} else {
			treffer = null;
			fehler = fehlerText(a);
		}
	}
</script>

<div class="feld">
	<label for="{id}-suche">{label}</label>
	<input
		id="{id}-suche"
		type="search"
		maxlength="100"
		autocomplete="off"
		aria-describedby={hilfe ? `${id}-suche-hilfe` : undefined}
		bind:value={() => suche, setzeSuche}
	/>
	{#if hilfe}
		<span class="feld-hilfe" id="{id}-suche-hilfe">{hilfe}</span>
	{/if}
</div>
<!-- Der Bereich ist immer da und gleich hoch; nur mit Treffern ist er eine per Tastatur scrollbare Region. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="treffer"
	role={hatTreffer ? 'region' : undefined}
	aria-label={hatTreffer ? legende : undefined}
	tabindex={hatTreffer ? 0 : undefined}
>
	{#if fehler}
		<p class="fehler" role="alert">{fehler}</p>
	{:else if treffer === null}
		<p class="leise">Ab 2 Buchstaben.</p>
	{:else if treffer.length === 0}
		<p>Keine Treffer.</p>
	{:else}
		<fieldset class="auswahl-gruppe">
			<legend>{legende}</legend>
			{#each treffer as t (t.mitgliedId)}
				{@const grund = gesperrt(t.mitgliedId)}
				<label class="auswahl">
					<input
						type="radio"
						name="{id}-spieler"
						value={t.mitgliedId}
						checked={gewaehlt === t.mitgliedId}
						disabled={grund !== null}
						onchange={() => onwahl(t)}
					/>
					<span
						><Name name={t.name} form="nachname-zuerst" /><br /><span class="leise"
							>{grund ?? trefferText(t)}</span
						></span
					>
				</label>
			{/each}
		</fieldset>
	{/if}
</div>
