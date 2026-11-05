<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import { uebertrageFairgate } from '../../../lib/verwaltung/api.ts';
	import { geaendertText, neueAngaben, tagText } from '../../../lib/verwaltung/anzeige.ts';
	import { leiteUm } from '../../../lib/verwaltung/umleiten.ts';

	let { data } = $props();

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
			fehler = MELDUNG.stoerung;
			return;
		}
		await invalidate('app:fairgate');
	}
</script>

<svelte:head>
	<title>Für Fairgate – MyTCO</title>
</svelte:head>

<h1>Für Fairgate</h1>
<p class="leise">
	Diese Mitglieder haben Angaben in MyTCO selbst geändert. Trag die neuen Werte in Fairgate nach und
	hake dann ab.
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
					<th><span class="leise">Erledigt</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.zeilen as z (z.id)}
					<tr>
						<td>{z.name}</td>
						<td>{z.mitgliedernummer ?? ''}</td>
						<td>{geaendertText(z.felder)}</td>
						<td>
							{#each neueAngaben(z) as zeile, i (i)}
								{#if i > 0}<br />{/if}{zeile}
							{/each}
						</td>
						<td>{tagText(z.seit)}</td>
						<td>
							<button
								type="button"
								class="taste-neben"
								disabled={laeuft !== null}
								onclick={() => hake(z.id, z.seit)}>In Fairgate übertragen</button
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="leise">
		Abgehakte Einträge verschwinden. Wer wann abgehakt hat, steht im Änderungsverlauf.
	</p>
{/if}
