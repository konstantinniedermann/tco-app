<!--
	UI-Leitbild, Ändern-Dialog: Die Taste «Ändern» einer Tabellenzeile öffnet ihn. Er nennt die
	Zeile (Name, voller Text wie ein Kommentar) und zeigt die Aktionen, die gerade gehen, je als
	Taste. Eine Taste schliesst ihn und öffnet den Dialog der Aktion; der Fokus kehrt danach wie
	beim Abbrechen zur Taste «Ändern» zurück. Einmal pro Liste.
-->
<script lang="ts">
	import type { Namensteile } from '../name.ts';
	import Name from '../ui/Name.svelte';
	import type { Zeilenaktion } from './zeilenaktionen.ts';

	type Wahl = { name: Namensteile; text?: string | null; aktionen: Zeilenaktion[] };
	type Props = { id: string };

	let { id }: Props = $props();

	let dialog = $state<HTMLDialogElement>();
	// Wird nur als Ganzes ersetzt, nie verändert.
	let wahl = $state.raw<Wahl | null>(null);

	/** Öffnet den Dialog für eine Zeile. */
	export function zeige(w: Wahl) {
		wahl = w;
		dialog?.showModal();
	}

	function waehle(a: Zeilenaktion) {
		dialog?.close();
		a.los();
	}

	// Geschlossen hält der Dialog keinen alten Stand (Name, Kommentar) im Dokument; erst nach dem
	// Ausblenden geleert, damit er dabei nicht leer schrumpft.
	async function leere() {
		const d = dialog;
		if (!d) return;
		await Promise.all(d.getAnimations().map((a) => a.finished.catch(() => undefined)));
		if (!d.open) wahl = null;
	}
</script>

<dialog class="karte" bind:this={dialog} aria-labelledby="{id}-titel" onclose={leere}>
	<h2 id="{id}-titel">Ändern</h2>
	{#if wahl}
		<p><Name name={wahl.name} form="nachname-zuerst" /></p>
		{#if wahl.text}
			<p class="mehrzeilig">{wahl.text}</p>
		{/if}
		<div class="leiste">
			{#each wahl.aktionen as a (a.name)}
				<button type="button" class="taste-neben" onclick={() => waehle(a)}>{a.name}</button>
			{/each}
		</div>
	{/if}
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => dialog?.close()}>Abbrechen</button>
	</div>
</dialog>
