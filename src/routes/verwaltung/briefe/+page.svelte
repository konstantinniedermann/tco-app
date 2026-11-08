<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Briefdruck from '../../../lib/verwaltung/Briefdruck.svelte';
	import {
		erzeugeBriefe,
		type AusgestellterBrief,
		type BriefListe
	} from '../../../lib/verwaltung/api.ts';
	import { fehlerText, tagText } from '../../../lib/verwaltung/anzeige.ts';
	import { leiteUm } from '../../../lib/verwaltung/umleiten.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const zeilen = $derived(data.zeilen);
	// Regel 3: Der MyTCO-Admin sieht die Liste, Briefe erzeugt nur der Mitglieder-Admin.
	const darfErzeugen = $derived(data.darfSchreiben.mitglieder);

	// Auswahl: Nach dem Neuladen zählen nur Mitglieder, die noch in der Liste stehen und eine
	// Adresse haben.
	let gewaehlt = $state<number[]>([]);
	const waehlbar = $derived(zeilen.filter((z) => !z.adresseFehlt).map((z) => z.id));
	const istWaehlbar = $derived(new Set(waehlbar));
	const auswahl = $derived(gewaehlt.filter((id) => istWaehlbar.has(id)));
	const istGewaehlt = $derived(new Set(auswahl));
	const alleGewaehlt = $derived(waehlbar.length > 0 && auswahl.length === waehlbar.length);

	function waehle(id: number, an: boolean) {
		gewaehlt = an ? [...auswahl, id] : auswahl.filter((g) => g !== id);
	}

	function briefText(z: BriefListe[number]): string {
		if (z.adresseFehlt) return 'Adresse fehlt';
		return z.briefGueltigBis ? `Code gültig bis ${tagText(z.briefGueltigBis)}` : 'noch kein Brief';
	}

	// RR-04: Die Codes leben nur in diesem Zustand, nie in der Adresse oder im Speicher.
	let briefe = $state.raw<AusgestellterBrief[] | null>(null);
	let fehler = $state<string | null>(null);
	let rueckfrage = $state<HTMLDialogElement>();

	// Eine Anfrage nach der anderen: ein Doppelklick stellt nicht zwei Mal Codes aus.
	let laeuft = false;
	async function einzeln(aktion: () => Promise<void>) {
		if (laeuft) return;
		laeuft = true;
		try {
			await aktion();
		} finally {
			laeuft = false;
		}
	}

	const erzeuge = () => einzeln(schickeAuswahl);
	async function schickeAuswahl() {
		fehler = null;
		const a = await erzeugeBriefe([...auswahl]);
		rueckfrage?.close();
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			gewaehlt = [];
			briefe = a.daten.briefe;
		} else if (a.art === 'nicht-moeglich') {
			fehler =
				'Nicht alle ausgewählten Mitglieder können einen Brief erhalten (inzwischen ausgetreten, gesperrt oder ohne Adresse). Es wurde kein Code ausgestellt.';
			await invalidateAll();
		} else {
			fehler = fehlerText(a);
		}
	}

	// Verwirft die Briefe samt Codes und lädt die Liste neu.
	function zurueck() {
		briefe = null;
		void invalidateAll();
	}
</script>

<svelte:head>
	<title>Briefe – MyTCO</title>
</svelte:head>

{#if briefe}
	<Briefdruck {briefe} {zurueck} />
{:else}
	<h1>Briefe</h1>
	<p class="leise">
		Mitglieder, die MyTCO noch nie geöffnet haben. Ein neuer Code ersetzt den alten.
	</p>

	{#if darfErzeugen && zeilen.length > 0}
		<div class="leiste">
			<button
				type="button"
				class="taste-haupt"
				disabled={auswahl.length === 0}
				onclick={() => rueckfrage?.showModal()}>Briefe erzeugen ({auswahl.length})</button
			>
		</div>
	{/if}

	{#if fehler}
		<p class="fehler" role="alert">{fehler}</p>
	{/if}

	{#if zeilen.length === 0}
		<p>Alle aktiven Mitglieder haben MyTCO schon geöffnet.</p>
	{:else if darfErzeugen}
		<div class="tabelle">
			<table>
				<thead>
					<tr>
						<th scope="col"
							><label
								><input
									type="checkbox"
									checked={alleGewaehlt}
									disabled={waehlbar.length === 0}
									onchange={(e) => (gewaehlt = e.currentTarget.checked ? [...waehlbar] : [])}
								/> Alle auswählen</label
							></th
						>
						<th scope="col">Name</th><th scope="col">Nummer</th><th scope="col">Brief</th>
					</tr>
				</thead>
				<tbody>
					{#each zeilen as z (z.id)}
						<tr>
							<td
								><input
									type="checkbox"
									aria-label="Auswählen: {z.name}"
									checked={istGewaehlt.has(z.id)}
									disabled={z.adresseFehlt}
									onchange={(e) => waehle(z.id, e.currentTarget.checked)}
								/></td
							>
							<td><strong>{z.name}</strong></td>
							<td>{z.mitgliedernummer ?? ''}</td>
							<td>{briefText(z)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="tabelle" role="region" aria-label="Briefe" tabindex="0">
			<table>
				<thead>
					<tr><th scope="col">Name</th><th scope="col">Nummer</th><th scope="col">Brief</th></tr>
				</thead>
				<tbody>
					{#each zeilen as z (z.id)}
						<tr>
							<td><strong>{z.name}</strong></td>
							<td>{z.mitgliedernummer ?? ''}</td>
							<td>{briefText(z)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{/if}

<dialog class="karte" bind:this={rueckfrage} aria-labelledby="briefe-titel">
	<h2 id="briefe-titel">
		{auswahl.length === 1 ? '1 Brief erzeugen?' : `${auswahl.length} Briefe erzeugen?`}
	</h2>
	<p>
		Die Codes erscheinen nur in der Druckansicht. Schliesst du sie ohne zu drucken, erzeugst du neue
		Briefe.
	</p>
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => rueckfrage?.close()}>Abbrechen</button>
		<button type="button" class="taste-haupt" onclick={erzeuge}>Briefe erzeugen</button>
	</div>
</dialog>
