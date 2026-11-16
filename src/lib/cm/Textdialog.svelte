<!--
	FR-08, FR-49: Rückfrage der CM-Seite mit einem Textfeld in einem Formular (Wildcard beantragen,
	Kommentar ändern) als `<dialog class="karte">`: Titel, der Name der Kategorie, das Feld mit
	Hinweis, Zähler und Fehler, darunter Abbrechen und die Haupttaste. Die Seite hält Text, Fehler
	und Sperre und schickt selbst ab (`onsubmit`); der Baustein ruft nichts ab. Die `id`s entstehen
	aus `id`: das Feld selbst, `…-titel`, `…-hinweis`, `…-zaehler`, `…-fehler`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		id: string;
		titel: string;
		/** Name der Kategorie unter dem Titel; ohne Namen keine Zeile. */
		ziel: string | null;
		hinweis: string;
		zeilen: number;
		laenge: number;
		/** Das Feld ist Pflicht (`required`); geprüft wird vor dem Senden auf der Seite. */
		pflicht?: boolean;
		zaehler: string;
		wert: string;
		fehler: string | null;
		taste: string;
		gesperrt: boolean;
		onsubmit: (event: SubmitEvent) => void;
		onclose: () => void;
		/** Die Beschriftung des Felds. */
		children: Snippet;
	};

	let {
		id,
		titel,
		ziel,
		hinweis,
		zeilen,
		laenge,
		pflicht = false,
		zaehler,
		wert = $bindable(),
		fehler,
		taste,
		gesperrt,
		onsubmit,
		onclose,
		children
	}: Props = $props();

	let dialog = $state<HTMLDialogElement>();
	let feld = $state<HTMLTextAreaElement>();

	export function oeffne() {
		dialog?.showModal();
	}

	export function schliesse() {
		dialog?.close();
	}

	/** Fokus ins Feld, etwa nach einem Fehler am Feld. */
	export function fokussiere() {
		feld?.focus();
	}
</script>

<dialog class="karte" bind:this={dialog} aria-labelledby="{id}-titel" {onclose}>
	<h2 id="{id}-titel">{titel}</h2>
	{#if ziel}<p class="leise">{ziel}</p>{/if}
	<form {onsubmit} novalidate>
		<div class="feld">
			<label for={id}>{@render children()}</label>
			<span class="feld-hilfe" id="{id}-hinweis">{hinweis}</span>
			<textarea
				{id}
				rows={zeilen}
				bind:this={feld}
				maxlength={laenge}
				bind:value={wert}
				required={pflicht}
				aria-invalid={fehler ? 'true' : undefined}
				aria-describedby={fehler
					? `${id}-hinweis ${id}-zaehler ${id}-fehler`
					: `${id}-hinweis ${id}-zaehler`}></textarea>
			<span class="feld-hilfe" id="{id}-zaehler">{zaehler}</span>
			{#if fehler}
				<p class="fehler" id="{id}-fehler" role="alert">{fehler}</p>
			{/if}
		</div>
		<div class="leiste">
			<button type="button" class="taste-neben" onclick={() => dialog?.close()}>Abbrechen</button>
			<button type="submit" class="taste-haupt" disabled={gesperrt}>{taste}</button>
		</div>
	</form>
</dialog>
