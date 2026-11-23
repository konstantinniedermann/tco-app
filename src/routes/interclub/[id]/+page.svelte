<script lang="ts">
	import { resolve } from '$app/paths';
	import Resultat from '../../../lib/interclub/Resultat.svelte';
	import { holeInterclubTeam, setzeFolgen } from '../../../lib/interclub/api.ts';
	import { entscheidText, nachRunde, teamText } from '../../../lib/interclub/anzeige.ts';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import { leiteUmNachAktion } from '../../../lib/login/waechter.ts';
	import Umschalter from '../../../lib/ui/Umschalter.svelte';
	import Zurueck from '../../../lib/ui/Zurueck.svelte';
	import type { PageProps } from './$types';

	// Seite eines Teams (UI-Leitbild): Umschalter «Spiele · Tabelle», vorgewählt die Spiele; ein
	// Tipp wechselt nur den Inhalt.
	let { data }: PageProps = $props();
	const t = $derived(data.team);
	let ansicht = $state<'spiele' | 'tabelle'>('spiele');

	const OPTIONEN: readonly { wert: 'spiele' | 'tabelle'; text: string }[] = [
		{ wert: 'spiele', text: 'Spiele' },
		{ wert: 'tabelle', text: 'Tabelle' }
	];

	// «Diesem Team folgen» (#81): Schalter wie in den Benachrichtigungen, gilt sofort. Es gibt ihn mit
	// Push auf irgendeinem Gerät oder wenn das Konto schon folgt (entfolgen geht immer); in der
	// Ansicht («Ansicht als …», nur ansehen) gibt es ihn nicht.
	const nurAnsehen = $derived(data.ansicht !== null);
	let folgen = $derived(data.team.folgen);
	let folgenLaeuft = $state(false);
	let folgenFehler = $state<string | null>(null);

	// Eine Anfrage nach der anderen: Solange eine läuft, ist der Schalter gesperrt. Scheitert sie,
	// zeigt er den Stand des Servers. Ohne Sitzung geht es zum Login.
	async function schalteFolgen(an: boolean) {
		if (folgenLaeuft) return;
		const teamId = t.teamId;
		folgenLaeuft = true;
		folgenFehler = null;
		folgen = { ...folgen, folgt: an };
		const r = await setzeFolgen(teamId, an);
		if (r.art === 'abgemeldet') {
			await leiteUmNachAktion(r);
			return;
		}
		// Inzwischen ein anderes Team geöffnet: Dessen Stand kam mit der Seite.
		if (teamId === t.teamId) {
			if (r.art === 'ok') folgen = { ...folgen, folgt: r.daten.folgt };
			else if (r.art === 'kein-push') folgen = { folgt: false, push: false };
			else {
				folgenFehler = MELDUNG.stoerung;
				const neu = await holeInterclubTeam(teamId);
				if (teamId === t.teamId)
					folgen = neu.art === 'ok' ? neu.daten.folgen : { ...folgen, folgt: !an };
			}
		}
		folgenLaeuft = false;
	}
</script>

<svelte:head>
	<title>{t.liga} – MyTCO</title>
</svelte:head>

<Zurueck />
<h1>{t.liga}</h1>
<p class="leise">{teamText(t.teamName, t.gruppe, t.rangliste)}</p>
{#if !nurAnsehen}
	{#if folgen.push || folgen.folgt || folgenLaeuft}
		<label class="auswahl">
			<input
				type="checkbox"
				bind:checked={() => folgen.folgt, (an) => schalteFolgen(an)}
				disabled={folgenLaeuft}
				aria-describedby={folgenFehler ? 'folgen-fehler' : undefined}
			/>
			<span
				>Diesem Team folgen<br /><span class="leise auswahl-hilfe">Push nach jedem Endstand</span
				></span
			>
		</label>
		{#if folgenFehler}
			<p class="fehler" id="folgen-fehler" role="alert">{folgenFehler}</p>
		{/if}
	{:else}
		<p>Mit Push kannst du diesem Team folgen. <a href={resolve('/profil')}>Push einrichten</a></p>
	{/if}
{/if}
<Umschalter wahl={ansicht} optionen={OPTIONEN} onwahl={(w) => (ansicht = w)} />

{#if ansicht === 'spiele'}
	{#each nachRunde(t.spiele) as r (r.runde)}
		<section class="karte" aria-labelledby="ic-runde-{r.runde}">
			<h2 id="ic-runde-{r.runde}">Runde {r.runde}</h2>
			{#each r.spiele as s, i (`${s.heim}-${s.gast}`)}
				<Resultat spiel={s} teil={i > 0} />
			{/each}
		</section>
	{/each}
{:else}
	<section class="karte" aria-labelledby="ic-gruppe">
		<h2 id="ic-gruppe">Gruppe {t.gruppe}</h2>
		{#if t.rangliste.length === 0}
			<p>Die Tabelle steht nach der ersten Runde.</p>
		{:else}
			<!-- Ausdrückliche Rollen: Bei grosser Schrift wird die Tabelle zum Raster (zweizeilige
			     Zeilen), und Safari vergisst dann die Rollen einer Tabelle. -->
			<!-- svelte-ignore a11y_no_redundant_roles -->
			<table class="rangliste" role="table">
				<!-- svelte-ignore a11y_no_redundant_roles -->
				<thead role="rowgroup">
					<!-- svelte-ignore a11y_no_redundant_roles -->
					<tr class="leise" role="row">
						<th scope="col" role="columnheader">Rang</th>
						<th scope="col" role="columnheader">Team</th>
						<th scope="col" role="columnheader">Partien</th>
						<th scope="col" role="columnheader">Sätze</th>
					</tr>
				</thead>
				<!-- svelte-ignore a11y_no_redundant_roles -->
				<tbody role="rowgroup">
					{#each t.rangliste as z (z.rang + z.teamName)}
						<!-- svelte-ignore a11y_no_redundant_roles -->
						<tr class={{ 'rangliste-eigen': z.eigen }} role="row">
							<td role="cell">{z.rang}.</td>
							<td role="cell">{z.teamName}</td>
							<td role="cell">{z.partienGewonnen}:{z.partienVerloren}</td>
							<td role="cell">{z.saetze}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
	{#if t.entscheide}
		<section class="karte" aria-labelledby="ic-entscheide">
			<h2 id="ic-entscheide">{entscheidText(t.entscheide.art)}</h2>
			{#each t.entscheide.spiele as s, i (`${s.runde}-${s.heim}-${s.gast}`)}
				<Resultat spiel={s} teil={i > 0} />
			{/each}
		</section>
	{/if}
{/if}
