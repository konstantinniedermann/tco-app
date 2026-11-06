<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { schaueAls, type AnsichtRolle } from './api.ts';
	import { fehlerText } from './anzeige.ts';
	import { ANSICHT_NAME } from './rollen-namen.ts';
	import { leiteUm, startziel } from './umleiten.ts';

	type Props = {
		/** Die laufende Ansicht dieser Sitzung; sie endet, bevor die neue beginnt. */
		laufend: AnsichtRolle | null;
	};
	let { laufend }: Props = $props();

	const WAHL = Object.keys(ANSICHT_NAME) as AnsichtRolle[];
	let wahl = $state<AnsichtRolle | null>(null);
	let fehler = $state<string | null>(null);
	let laeuft = $state(false);

	async function ansehen(event: SubmitEvent) {
		event.preventDefault();
		if (wahl === null || laeuft) return;
		laeuft = true;
		fehler = null;
		const a = await schaueAls(wahl, laufend);
		laeuft = false;
		if (await leiteUm(a)) return;
		if (a.art !== 'ok') {
			fehler = fehlerText(a);
			return;
		}
		// Zur ersten Seite der gewählten Rolle; Mitglied und Lizenz-Admin haben (noch) keine
		// Verwaltung. Band und Bereiche hängen an der Sitzung: alles neu laden.
		if (wahl === 'mitglieder' || wahl === 'cm') {
			await goto(resolve(startziel([wahl])), { refreshAll: true });
		} else {
			await goto(resolve('/'), { refreshAll: true });
		}
	}
</script>

<section class="karte" aria-labelledby="ansicht-titel">
	<h2 id="ansicht-titel">Ansicht als …</h2>
	<p class="leise">
		Sieh MyTCO so, wie es jemand mit genau dieser Rolle sieht, mit deinem eigenen Konto. Du kannst
		dabei nichts speichern. Oben steht ein Band mit «Beenden».
	</p>
	<form onsubmit={ansehen} novalidate>
		<fieldset class="auswahl-gruppe" aria-describedby={fehler ? 'ansicht-fehler' : 'ansicht-hilfe'}>
			<legend>Ansehen als</legend>
			{#each WAHL as r (r)}
				<label class="auswahl">
					<input type="radio" name="ansicht" value={r} bind:group={wahl} />{ANSICHT_NAME[r]}
				</label>
			{/each}
		</fieldset>
		<p class="leise" id="ansicht-hilfe">
			Mitglied und Lizenz-Admin sehen nur die App, nicht die Verwaltung.
		</p>
		<button type="submit" class="taste-haupt" disabled={wahl === null || laeuft}>Ansehen</button>
		{#if fehler}
			<p class="fehler" id="ansicht-fehler" role="alert">{fehler}</p>
		{/if}
	</form>
</section>
