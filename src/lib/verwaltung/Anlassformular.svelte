<script lang="ts" module>
	import type { AnlassFeld } from './api.ts';

	/** Alle Felder als Text; Zeiten in Schweizer Zeit wie `<input type="datetime-local">`. */
	export type AnlassWerte = Record<AnlassFeld, string>;

	export const LEERER_ANLASS: AnlassWerte = {
		titel: '',
		beginn: '',
		ort: '',
		anmeldeschluss: '',
		einladung: ''
	};

	/** Annahme K-50: Vorschlag für den Anmeldeschluss, drei Tage vor dem Beginn um 23.59 Uhr. */
	export function vorgeschlagenerSchluss(beginn: string): string {
		const m = /^(\d{4})-(\d{2})-(\d{2})T/.exec(beginn);
		if (!m) return '';
		const tag = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) - 3));
		return `${tag.toISOString().slice(0, 10)}T23:59`;
	}
</script>

<script lang="ts">
	type Props = {
		start: AnlassWerte;
		fehler: Partial<Record<AnlassFeld, string>>;
		knopf: string;
		/** Die Taste ist grau, solange nichts geändert ist (Bearbeiten). */
		nurBeiAenderung?: boolean;
		rueckmeldung?: string | null;
		onspeichern: (werte: AnlassWerte) => void;
	};
	let {
		start,
		fehler,
		knopf,
		nurBeiAenderung = false,
		rueckmeldung = null,
		onspeichern
	}: Props = $props();

	// Das Formular wird von aussen neu aufgebaut (`{#key}`), wenn sich `start` ändert.
	// svelte-ignore state_referenced_locally
	let werte = $state<AnlassWerte>({ ...start });
	let formular = $state<HTMLFormElement>();

	const REIHE: AnlassFeld[] = ['titel', 'beginn', 'ort', 'anmeldeschluss', 'einladung'];
	const NAMEN: Record<AnlassFeld, string> = {
		titel: 'Titel',
		beginn: 'Beginn',
		ort: 'Ort',
		anmeldeschluss: 'Anmeldeschluss',
		einladung: 'Einladung (freiwillig)'
	};

	const geaendert = $derived(REIHE.some((f) => werte[f] !== start[f]));

	// UI-06: nach einer Rückmeldung des Servers steht der Fokus im ersten Feld mit Fehler.
	$effect(() => {
		const erstes = REIHE.find((f) => fehler[f]);
		if (erstes) formular?.querySelector<HTMLElement>(`#anlass-${erstes}`)?.focus();
	});

	function beginnVerlassen() {
		if (!werte.anmeldeschluss) werte.anmeldeschluss = vorgeschlagenerSchluss(werte.beginn);
	}

	function abschicken(event: SubmitEvent) {
		event.preventDefault();
		onspeichern({ ...werte });
	}
</script>

<form bind:this={formular} onsubmit={abschicken} novalidate>
	{#each REIHE as f (f)}
		<div class="feld-zeile">
			<label for="anlass-{f}">{NAMEN[f]}</label>
			{#if f === 'einladung'}
				<textarea
					id="anlass-{f}"
					rows="6"
					bind:value={werte[f]}
					aria-invalid={fehler[f] ? 'true' : undefined}
					aria-describedby={fehler[f] ? `fehler-anlass-${f}` : undefined}></textarea>
			{:else if f === 'beginn' || f === 'anmeldeschluss'}
				<input
					id="anlass-{f}"
					type="datetime-local"
					bind:value={werte[f]}
					onblur={f === 'beginn' ? beginnVerlassen : undefined}
					aria-invalid={fehler[f] ? 'true' : undefined}
					aria-describedby={fehler[f] ? `fehler-anlass-${f}` : undefined}
				/>
			{:else}
				<input
					id="anlass-{f}"
					type="text"
					maxlength="120"
					autocomplete="off"
					bind:value={werte[f]}
					aria-invalid={fehler[f] ? 'true' : undefined}
					aria-describedby={fehler[f] ? `fehler-anlass-${f}` : undefined}
				/>
			{/if}
			{#if fehler[f]}
				<p class="fehler" id="fehler-anlass-{f}">{fehler[f]}</p>
			{/if}
		</div>
	{/each}
	<button type="submit" class="taste-haupt" disabled={nurBeiAenderung && !geaendert}>{knopf}</button
	>
	<span class="leise" role="status"
		>{#if rueckmeldung && !geaendert}{rueckmeldung}{/if}</span
	>
</form>
