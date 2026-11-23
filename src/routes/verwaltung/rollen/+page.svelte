<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Seitenkopf from '../../../lib/verwaltung/Seitenkopf.svelte';
	import Seiteninfo from '../../../lib/verwaltung/Seiteninfo.svelte';
	import AnsichtWahl from '../../../lib/verwaltung/AnsichtWahl.svelte';
	import Aktionsdialog from '../../../lib/verwaltung/Aktionsdialog.svelte';
	import Spielersuche from '../../../lib/verwaltung/Spielersuche.svelte';
	import { ROLLEN_NAME } from '../../../lib/verwaltung/rollen-namen.ts';
	import { entziehRolle, vergibRolle } from '../../../lib/verwaltung/zugang-api.ts';
	import type { Rolle } from '../../../lib/verwaltung/mitglieder-api.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Dialog = ReturnType<typeof Aktionsdialog>;

	const anzahl = (n: number) => `${n} ${n === 1 ? 'Mitglied' : 'Mitglieder'}`;

	// A-ROLLE-01: Vergeben. Die Suche beginnt bei jedem Öffnen leer (`{#key}`).
	let vergeben = $state<Dialog>();
	let vergabeRolle = $state<Rolle>('cm');
	let wahl = $state<{ id: number; name: string } | null>(null);
	let suchlauf = $state(0);
	const hatRolle = (rolle: Rolle, id: number) =>
		data.liste.find((e) => e.rolle === rolle)?.mitglieder.some((m) => m.id === id) ?? false;

	function oeffneVergeben(rolle: Rolle) {
		vergabeRolle = rolle;
		wahl = null;
		suchlauf++;
		vergeben?.oeffne();
	}

	// A-ROLLE-01, RR-03: Entziehen mit Rückfrage; beim eigenen MyTCO-Admin mit Folge.
	let entziehen = $state<Dialog>();
	let ziel = $state<{ id: number; name: string; rolle: Rolle } | null>(null);
	const eigenerMytco = $derived(
		ziel !== null && ziel.rolle === 'mytco' && ziel.id === data.eigeneMitgliedId
	);

	function oeffneEntziehen(rolle: Rolle, m: { id: number; name: string }) {
		ziel = { ...m, rolle };
		entziehen?.oeffne();
	}

	let rueckmeldung = $state('');
	async function fertig(satz: string) {
		rueckmeldung = satz;
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Rollen – MyTCO</title>
</svelte:head>

<Seitenkopf>
	<h1>Rollen</h1>
</Seitenkopf>
<Seiteninfo>
	<p>
		Wer welche Rolle hat. Hier werden Rollen vergeben und entzogen; ein MyTCO-Admin bleibt immer.
	</p>
</Seiteninfo>
<p class="leise" role="status">{rueckmeldung}</p>

{#each data.liste as eintrag (eintrag.rolle)}
	{@const rolle = ROLLEN_NAME[eintrag.rolle]}
	<details class="karte klappe">
		<summary class="klappe-titel"
			>{rolle} <span class="leise">{anzahl(eintrag.mitglieder.length)}</span></summary
		>
		{#if eintrag.mitglieder.length === 0}
			<p class="leise">Niemand hat diese Rolle.</p>
		{:else}
			<ul class="trefferliste" aria-label={rolle}>
				{#each eintrag.mitglieder as m (m.id)}
					<li class="kachel">
						<a
							id="rolle-{eintrag.rolle}-{m.id}"
							href={resolve('/verwaltung/mitglieder/[id]', { id: String(m.id) })}>{m.name}</a
						>
						<button
							type="button"
							class="taste-neben"
							aria-describedby="rolle-{eintrag.rolle}-{m.id}"
							onclick={() => oeffneEntziehen(eintrag.rolle, m)}>Entziehen</button
						>
					</li>
				{/each}
			</ul>
		{/if}
		<div class="leiste">
			<button type="button" class="taste-neben" onclick={() => oeffneVergeben(eintrag.rolle)}
				>{rolle} vergeben</button
			>
		</div>
	</details>
{/each}

<AnsichtWahl laufend={data.ansicht} />

<Aktionsdialog
	bind:this={vergeben}
	id="vergeben"
	titel="{ROLLEN_NAME[vergabeRolle]} vergeben"
	taste="Vergeben"
	bereit={wahl !== null}
	aktion={() => vergibRolle(wahl!.id, vergabeRolle)}
	erfolg="{wahl?.name} ist jetzt {ROLLEN_NAME[vergabeRolle]}."
	folgen={{ 'nicht-gefunden': 'Dieses Mitglied gibt es nicht mehr.' }}
	onfertig={fertig}
>
	{#key suchlauf}
		<Spielersuche
			id="vergeben"
			label="Mitglied suchen"
			gewaehlt={wahl?.id ?? null}
			gesperrt={(id) => (hatRolle(vergabeRolle, id) ? 'hat die Rolle schon' : null)}
			onwahl={(t) => {
				wahl = t ? { id: t.mitgliedId, name: `${t.name.nachname}, ${t.name.vorname}` } : null;
				vergeben?.verwerfe();
			}}
		/>
	{/key}
</Aktionsdialog>

<Aktionsdialog
	bind:this={entziehen}
	id="entziehen"
	titel="Rolle {ziel ? ROLLEN_NAME[ziel.rolle] : ''} entziehen?"
	taste="Entziehen"
	bereit={ziel !== null}
	aktion={() => entziehRolle(ziel!.id, ziel!.rolle)}
	erfolg="{ziel?.name} hat die Rolle {ziel ? ROLLEN_NAME[ziel.rolle] : ''} nicht mehr."
	folgen={{ 'nicht-gefunden': 'Dieses Mitglied gibt es nicht mehr.' }}
	onfertig={fertig}
>
	{#if ziel}
		<p>{ziel.name}</p>
		{#if eigenerMytco}
			<p>Du kannst danach keine Rollen mehr vergeben und siehst diese Seite nicht mehr.</p>
		{/if}
	{/if}
</Aktionsdialog>
