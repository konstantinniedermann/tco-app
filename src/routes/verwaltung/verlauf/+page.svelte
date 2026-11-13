<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import { ladeVerlauf, type VerlaufEintrag } from '../../../lib/verwaltung/mitglieder-api.ts';
	import Seitenkopf from '../../../lib/verwaltung/Seitenkopf.svelte';
	import { aktionText, zeitText } from '../../../lib/verwaltung/anzeige.ts';
	import { leiteUm } from '../../../lib/verwaltung/umleiten.ts';

	// «?mitglied=<id>» zeigt nur die Einträge dieses Mitglieds.
	const mitglied = $derived.by(() => {
		const roh = page.url.searchParams.get('mitglied');
		return roh !== null && /^\d+$/.test(roh) ? Number(roh) : undefined;
	});
	let zeilen = $state<VerlaufEintrag[]>([]);
	// Pfad «Mitglieder › Nachname, Vorname › Änderungsverlauf»: Der Name steht in jeder Zeile des
	// Verlaufs. Bis sie da sind (oder wenn es keine gibt), steht «Mitglied» – der Pfad ist sofort
	// da, der Titel rutscht nicht nach, und der Rückweg fehlt nie.
	const name = $derived(
		zeilen.find((z) => z.mitglied.id === mitglied)?.mitglied.name ?? 'Mitglied'
	);
	let fehler = $state<string | null>(null);
	let geladen = $state(false);

	$effect(() => {
		const id = mitglied;
		let aktuell = true;
		ladeVerlauf({ mitglied: id }).then(async (a) => {
			if (!aktuell || (await leiteUm(a))) return;
			geladen = true;
			if (a.art === 'ok') {
				zeilen = a.daten;
				fehler = null;
			} else {
				fehler = MELDUNG.stoerung;
			}
		});
		return () => {
			aktuell = false;
		};
	});
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
{#if geladen && zeilen.length === 0 && !fehler}
	<p class="leise">Noch keine Einträge.</p>
{/if}
