<!--
	FR-46: Rückfrage der Doppel-Verwaltung als `<dialog class="karte">`: Inhalt der Seite, darunter
	Warnungen als Liste und Fehler, dann Abbrechen und die Haupttaste. Nach `409 warnung` heisst die
	Haupttaste «Trotzdem …» und schickt die Aktion mit `trotzdem`. Bei Erfolg und bei den Antworten
	in `folgen` (der Stand hat sich inzwischen geändert) schliesst der Dialog und `onfertig` lädt die
	Seite neu und sagt es in einem Satz.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Antwort } from './api.ts';
	import { fehlerText } from './anzeige.ts';
	import { doppelWarnungen } from './turnier-anzeige.ts';
	import { leiteUm } from './umleiten.ts';

	type Art = Antwort<unknown>['art'];

	type Props = {
		id: string;
		titel: string;
		taste: string;
		/** Haupttaste nach einer Warnung; ohne bleibt sie gleich (Aktionen ohne Warnung). */
		trotzdemTaste?: string;
		/** Die Haupttaste geht erst, wenn alles gewählt ist. */
		bereit?: boolean;
		/** Spieler, die eine Warnung `voll` betreffen kann. */
		namen?: string[];
		aktion: (trotzdem: boolean) => Promise<Antwort<unknown>>;
		erfolg: string;
		folgen?: Partial<Record<Art, string>>;
		onfertig: (satz: string) => Promise<void>;
		onschliessen?: () => void;
		children: Snippet;
	};

	let {
		id,
		titel,
		taste,
		trotzdemTaste = taste,
		bereit = true,
		namen = [],
		aktion,
		erfolg,
		folgen = {},
		onfertig,
		onschliessen,
		children
	}: Props = $props();

	let dialog = $state<HTMLDialogElement>();
	let laeuft = $state(false);
	let fehler = $state<string | null>(null);
	let warnungen = $state<Antwort<unknown> & { art: 'warnung' }>();
	// Zählt jedes Öffnen und jede neue Wahl: Eine Antwort auf einen älteren Stand zeigt keine
	// Warnungen und Fehler mehr an und schliesst den Dialog nicht.
	let stand = 0;

	/** Öffnet den Dialog ohne Warnungen und Fehler vom letzten Mal. */
	export function oeffne() {
		verwerfe();
		dialog?.showModal();
	}

	/** Nach einer neuen Wahl gelten die Warnungen nicht mehr. */
	export function verwerfe() {
		stand++;
		warnungen = undefined;
		fehler = null;
	}

	async function ausfuehren() {
		if (laeuft || !bereit) return;
		laeuft = true;
		fehler = null;
		// Wirft etwas (z. B. das Neuladen in `onfertig`), bleibt die Haupttaste nicht gesperrt.
		try {
			const nr = stand;
			const a = await aktion(warnungen !== undefined);
			if (await leiteUm(a)) {
				dialog?.close();
				return;
			}
			const satz = a.art === 'ok' ? erfolg : a.art === 'warnung' ? undefined : folgen[a.art];
			// Wurde der Dialog inzwischen geschlossen, neu geöffnet oder etwas anderes gewählt, gehören
			// Warnungen und Fehler zu keinem Dialog mehr. Ein geänderter Stand lädt trotzdem neu.
			if (nr !== stand || !dialog?.open) {
				if (satz !== undefined) await onfertig(satz);
				return;
			}
			if (a.art === 'warnung') {
				warnungen = a;
			} else if (satz === undefined) {
				fehler = fehlerText(a);
			} else {
				dialog.close();
				await onfertig(satz);
			}
		} finally {
			laeuft = false;
		}
	}
</script>

<dialog class="karte" bind:this={dialog} aria-labelledby="{id}-titel" onclose={onschliessen}>
	<h2 id="{id}-titel">{titel}</h2>
	{@render children()}
	{#if warnungen}
		<div role="alert">
			<ul>
				{#each doppelWarnungen(warnungen.warnungen, namen) as satz (satz)}
					<li>{satz}</li>
				{/each}
			</ul>
		</div>
	{/if}
	{#if fehler}
		<p class="fehler" role="alert">{fehler}</p>
	{/if}
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => dialog?.close()}>Abbrechen</button>
		<button type="button" class="taste-haupt" disabled={!bereit || laeuft} onclick={ausfuehren}
			>{warnungen ? trotzdemTaste : taste}</button
		>
	</div>
</dialog>
