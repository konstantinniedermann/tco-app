<script lang="ts">
	import Seitenkopf from '../../../lib/verwaltung/Seitenkopf.svelte';
	import { invalidate } from '$app/navigation';
	import { uebertrageFairgate } from '../../../lib/verwaltung/mitglieder-api.ts';
	import {
		geaendertText,
		neueAngaben,
		tagText,
		fehlerText
	} from '../../../lib/verwaltung/anzeige.ts';
	import { leiteUm } from '../../../lib/verwaltung/umleiten.ts';

	const ALT_TEXT = 'Änderung älter als 12 Monate, Angaben in Fairgate prüfen.';

	let { data } = $props();
	const darfAbhaken = $derived(data.darfSchreiben.mitglieder);

	let meldung = $state<string | null>(null);
	let fehler = $state<string | null>(null);
	let laeuft = $state<number | null>(null);

	async function hake(id: number, seit: string) {
		laeuft = id;
		meldung = null;
		fehler = null;
		const a = await uebertrageFairgate(id, seit);
		laeuft = null;
		if (await leiteUm(a)) return;
		if (a.art === 'veraltet') {
			meldung = 'Das Mitglied hat inzwischen weitere Angaben geändert. Hier ist der neue Stand.';
		} else if (a.art !== 'ok' && a.art !== 'nicht-gefunden') {
			// «nicht gefunden»: schon abgehakt (zweiter Tab); die Liste zeigt dann den aktuellen Stand.
			fehler = fehlerText(a);
			return;
		}
		await invalidate('app:fairgate');
	}
</script>

<svelte:head>
	<title>Für Fairgate – MyTCO</title>
</svelte:head>

<Seitenkopf>
	<h1>Für Fairgate</h1>
</Seitenkopf>
<p class="leise">
	Diese Mitglieder haben Angaben in MyTCO selbst geändert.
	{#if darfAbhaken}Trag die neuen Werte in Fairgate nach und hake dann ab.{/if}
</p>

{#if meldung}
	<p class="hinweis" role="status">{meldung}</p>
{/if}
{#if fehler}
	<p class="fehler" role="alert">{fehler}</p>
{/if}

{#if data.zeilen.length === 0}
	<p class="leise">Nichts zu übertragen.</p>
{:else}
	<div class="tabelle">
		<table>
			<thead>
				<tr>
					<th>Mitglied</th><th>Nr.</th><th>Geändert</th><th>Neue Angaben</th><th>Seit</th>
					{#if darfAbhaken}<th><span class="leise">Erledigt</span></th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each data.zeilen as z (z.id)}
					{@const angaben = neueAngaben(z).join(' · ')}
					<tr>
						<td>{z.name}</td>
						<td>{z.mitgliedernummer ?? ''}</td>
						<td>
							{#if z.verlaufGeloescht}
								<span>{ALT_TEXT}</span>
							{:else}
								{geaendertText(z.felder)}
							{/if}
						</td>
						<td>{angaben}</td>
						<td>{tagText(z.seit)}</td>
						{#if darfAbhaken}
							<td>
								<button
									type="button"
									class="taste-neben"
									disabled={laeuft !== null}
									onclick={() => hake(z.id, z.seit)}>In Fairgate übertragen</button
								>
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="leise">
		Abgehakte Einträge verschwinden. Wer wann abgehakt hat, steht im Änderungsverlauf.
	</p>
{/if}
