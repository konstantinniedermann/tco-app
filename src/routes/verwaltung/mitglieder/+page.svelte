<script lang="ts">
	import { resolve } from '$app/paths';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import { ladeMitglieder, type MitgliedZeile } from '../../../lib/verwaltung/api.ts';
	import { ROLLEN_NAMEN, plakette } from '../../../lib/verwaltung/anzeige.ts';
	import { leiteUm } from '../../../lib/verwaltung/umleiten.ts';

	let suche = $state('');
	let status = $state('');
	let zeilen = $state<MitgliedZeile[]>([]);
	let fehler = $state<string | null>(null);
	let geladen = $state(false);
	// Nur die neueste Antwort zählt, wenn mehrere Abfragen unterwegs sind.
	let abfrage = 0;

	async function lade(s: string, st: string) {
		const nr = ++abfrage;
		const a = await ladeMitglieder({ suche: s.trim(), status: st });
		if (nr !== abfrage || (await leiteUm(a))) return;
		geladen = true;
		if (a.art === 'ok') {
			zeilen = a.daten;
			fehler = null;
		} else {
			fehler = MELDUNG.stoerung;
		}
	}

	// Beim Tippen kurz warten, damit nicht jede Taste eine Abfrage auslöst.
	$effect(() => {
		const s = suche;
		const st = status;
		const warten = setTimeout(() => lade(s, st), 200);
		return () => clearTimeout(warten);
	});

	const rollenText = (rollen: MitgliedZeile['rollen']) =>
		['Mitglied', ...rollen.map((r) => ROLLEN_NAMEN[r])].join(', ');
</script>

<svelte:head>
	<title>Mitglieder – MyTCO</title>
</svelte:head>

<h1>Mitglieder</h1>
<p class="leise" role="status">
	{#if geladen}{zeilen.length} {zeilen.length === 1 ? 'Mitglied' : 'Mitglieder'}{/if}
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
			<option value="geloescht">gelöscht</option>
		</select>
	</div>
	<a class="taste-haupt" href={resolve('/verwaltung/mitglieder/neu')}>Mitglied anlegen</a>
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
{#if geladen && zeilen.length === 0 && !fehler}
	<p class="leise">Keine Mitglieder gefunden. Prüf die Suche oder den Filter.</p>
{/if}
