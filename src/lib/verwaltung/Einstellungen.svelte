<script lang="ts">
	import { datumText, THEMA_NAME } from './anzeige.ts';
	import type { MitgliedDetail } from './mitglieder-api.ts';

	let { einstellungen }: { einstellungen: MitgliedDetail['einstellungen'] } = $props();

	const themen = $derived(
		einstellungen.themen.length === 0
			? 'keine'
			: einstellungen.themen.map((t) => THEMA_NAME[t]).join(', ')
	);
	const mitPush = $derived(einstellungen.geraete.filter((g) => g.pushSeit !== null).length);
	const kurz = $derived(
		mitPush === 0 ? 'ohne Push' : `Push auf ${mitPush} ${mitPush === 1 ? 'Gerät' : 'Geräten'}`
	);

	function passkeyText(p: MitgliedDetail['einstellungen']['passkeys'][number]): string {
		const zuletzt = p.zuletztBenutzt
			? `zuletzt benutzt am ${datumText(p.zuletztBenutzt)}`
			: 'nie benutzt';
		return `${p.geraet} · eingerichtet am ${datumText(p.eingerichtetAm)} · ${zuletzt}`;
	}
</script>

<details class="karte klappe">
	<summary class="klappe-titel">Einstellungen <span class="leise">{kurz}</span></summary>
	<p><strong>Mitteilungen:</strong> {themen}</p>
	{#if einstellungen.geraete.length === 0}
		<p>Kein Gerät angemeldet.</p>
	{:else}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="tabelle" role="region" aria-label="Geräte" tabindex="0">
			<table>
				<thead
					><tr
						><th scope="col">Angemeldet am</th><th scope="col">Zuletzt genutzt</th><th scope="col"
							>Push</th
						></tr
					></thead
				>
				<tbody>
					{#each einstellungen.geraete as g, i (i)}
						<tr
							><td>{datumText(g.angemeldetAm)}</td><td>{datumText(g.zuletztGenutzt)}</td><td
								>{g.pushSeit ? `an seit ${datumText(g.pushSeit)}` : 'aus'}</td
							></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	{#if einstellungen.passkeys.length === 0}
		<p>Kein Passkey.</p>
	{:else}
		<p><strong>Passkeys:</strong></p>
		<ul>
			{#each einstellungen.passkeys as p, i (i)}
				<li>{passkeyText(p)}</li>
			{/each}
		</ul>
	{/if}
	<p class="leise">
		Stand jetzt. Mitteilungen gelten fürs Konto, Push für jedes Gerät einzeln. Was nur auf dem Gerät
		liegt, sieht die Verwaltung nicht.
	</p>
</details>
