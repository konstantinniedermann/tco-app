<script lang="ts">
	import { untrack } from 'svelte';
	import Seitenkopf from '../../../lib/verwaltung/Seitenkopf.svelte';
	import { resolve } from '$app/paths';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import { ladeMitglieder, type MitgliedZeile } from '../../../lib/verwaltung/mitglieder-api.ts';
	import { plakette } from '../../../lib/verwaltung/anzeige.ts';
	import { ROLLEN_NAME } from '../../../lib/verwaltung/rollen-namen.ts';
	import { leiteUm } from '../../../lib/verwaltung/umleiten.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let suche = $state('');
	let status = $state('');
	// Das erste Laden steht in `+page.ts` (`null` heisst «nicht geladen»); danach gehört die Liste
	// der Suche. Lädt SvelteKit die Seite erneut (etwa nach «Beenden» im Band), bleibt sie stehen.
	const erstesLaden = untrack(() => data.zeilen);
	let zeilen = $state<MitgliedZeile[]>(erstesLaden ?? []);
	let fehler = $state<string | null>(erstesLaden === null ? MELDUNG.stoerung : null);
	// Nur die neueste Antwort zählt, wenn mehrere Abfragen unterwegs sind.
	let abfrage = 0;

	async function lade(s: string, st: string) {
		const nr = ++abfrage;
		const a = await ladeMitglieder({ suche: s.trim(), status: st });
		if (nr !== abfrage || (await leiteUm(a))) return;
		if (a.art === 'ok') {
			zeilen = a.daten;
			fehler = null;
		} else {
			fehler = MELDUNG.stoerung;
		}
	}

	// Beim Tippen kurz warten, damit nicht jede Taste eine Abfrage auslöst. Beim Einhängen nicht:
	// Da kommt die Liste aus `+page.ts`.
	let eingehaengt = false;
	$effect(() => {
		const s = suche;
		const st = status;
		if (!eingehaengt) {
			eingehaengt = true;
			return;
		}
		const warten = setTimeout(() => lade(s, st), 200);
		return () => clearTimeout(warten);
	});

	const rollenText = (rollen: MitgliedZeile['rollen']) =>
		['Mitglied', ...rollen.map((r) => ROLLEN_NAME[r])].join(', ');
	const anzahl = $derived(`${zeilen.length} ${zeilen.length === 1 ? 'Mitglied' : 'Mitglieder'}`);
</script>

<svelte:head>
	<title>Mitglieder – MyTCO</title>
</svelte:head>

<Seitenkopf>
	<h1>Mitglieder</h1>
</Seitenkopf>
<p class="leise" role="status">
	{anzahl}
</p>

<div class="leiste">
	<div class="feld">
		<label for="suche">Suchen</label>
		<input id="suche" type="search" placeholder="Name, E-Mail oder Nummer" bind:value={suche} />
	</div>
	<div class="feld">
		<label for="status">Status</label>
		<select id="status" bind:value={status}>
			<option value="">Alle</option>
			<option value="aktiv">aktiv</option>
			<option value="ausgetreten">ausgetreten</option>
			<option value="vorgemerkt">wird gelöscht</option>
		</select>
	</div>
	{#if data.darfSchreiben.mitglieder}
		<a class="taste-haupt" href={resolve('/verwaltung/mitglieder/neu')}>Mitglied anlegen</a>
	{/if}
</div>

{#if fehler}
	<p class="fehler" role="alert">{fehler}</p>
{/if}

<div class="tabelle">
	<table>
		<thead>
			<tr>
				<th>Nummer</th><th>Name</th><th>E-Mail</th><th>Jahrgang</th><th>Rollen</th><th>Konto</th>
				<th><span class="leise">Aktion</span></th>
			</tr>
		</thead>
		<tbody>
			{#each zeilen as z (z.id)}
				{@const p = plakette(z)}
				<tr>
					<td>{z.mitgliedernummer ?? ''}</td>
					<td><strong>{z.name}</strong></td>
					<td>{z.email}</td>
					<td>{z.jahrgang ?? ''}</td>
					<td>{rollenText(z.rollen)}</td>
					<td><span class={p.klasse}>{p.text}</span></td>
					<td>
						<a
							href={resolve('/verwaltung/mitglieder/[id]', { id: String(z.id) })}
							aria-label="Bearbeiten: {z.name}">Bearbeiten</a
						>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
{#if zeilen.length === 0 && !fehler}
	<p class="leise">Keine Mitglieder gefunden. Prüf die Suche oder den Filter.</p>
{/if}
