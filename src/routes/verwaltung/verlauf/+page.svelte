<script lang="ts">
	import { resolve } from '$app/paths';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import type { VerlaufEintrag } from '../../../lib/verwaltung/mitglieder-api.ts';
	import Seitenkopf from '../../../lib/verwaltung/Seitenkopf.svelte';
	import { aktionText, zeitText } from '../../../lib/verwaltung/anzeige.ts';
	import type { PageProps } from './$types';

	// Den Verlauf lädt `+page.ts` vor dem Anzeigen, auch nach einem Wechsel des Filters (Adresse);
	// `null` heisst «nicht geladen» (Störung). Dann bleibt der zuletzt geladene Stand stehen.
	let { data }: PageProps = $props();
	const mitglied = $derived(data.mitglied);
	let zuletzt: VerlaufEintrag[] = [];
	const zeilen = $derived.by(() => (zuletzt = data.zeilen ?? zuletzt));
	const fehler = $derived(data.zeilen === null ? MELDUNG.stoerung : null);
	// Pfad «Mitglieder › Nachname, Vorname › Änderungsverlauf»: Der Name steht in jeder Zeile des
	// Verlaufs. Gibt es keine, steht «Mitglied» – der Titel rutscht nicht nach, und der Rückweg
	// fehlt nie.
	const name = $derived(
		zeilen.find((z) => z.mitglied.id === mitglied)?.mitglied.name ?? 'Mitglied'
	);
</script>

<svelte:head>
	<title>Änderungsverlauf – MyTCO</title>
</svelte:head>

<Seitenkopf
	pfad={mitglied !== undefined
		? {
				stufen: [
					{ text: 'Mitglieder', href: resolve('/verwaltung/mitglieder') },
					{
						text: name,
						href: resolve('/verwaltung/mitglieder/[id]', { id: String(mitglied) })
					}
				],
				aktuell: 'Änderungsverlauf'
			}
		: undefined}
>
	<h1>Änderungsverlauf</h1>
</Seitenkopf>
<p class="leise">
	{mitglied === undefined
		? 'Die letzten 100 Einträge, neueste zuerst.'
		: 'Nur dieses Mitglied, neueste zuerst.'}
	Ohne alte und neue Werte.
	{#if mitglied !== undefined}
		<a href={resolve('/verwaltung/verlauf')}>Alle anzeigen</a>
	{/if}
</p>

{#if fehler}
	<p class="fehler" role="alert">{fehler}</p>
{/if}

<div class="tabelle">
	<table>
		<thead>
			<tr><th>Zeit</th><th>Wer</th><th>Mitglied</th><th>Was</th></tr>
		</thead>
		<tbody>
			{#each zeilen as z, i (i)}
				<tr>
					<td>{zeitText(z.zeitpunkt)}</td>
					<td>{z.urheber}</td>
					<td>
						<a href={resolve('/verwaltung/mitglieder/[id]', { id: String(z.mitglied.id) })}
							>{z.mitglied.name}</a
						>
					</td>
					<td>{aktionText(z)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
{#if zeilen.length === 0 && !fehler}
	<p class="leise">Noch keine Einträge.</p>
{/if}
