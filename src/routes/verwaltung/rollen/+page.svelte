<script lang="ts">
	import { resolve } from '$app/paths';
	import AnsichtWahl from '../../../lib/verwaltung/AnsichtWahl.svelte';
	import { ROLLEN_NAME } from '../../../lib/verwaltung/rollen-namen.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const anzahl = (n: number) => `${n} ${n === 1 ? 'Mitglied' : 'Mitglieder'}`;
</script>

<svelte:head>
	<title>Rollen – MyTCO</title>
</svelte:head>

<h1>Rollen</h1>
<p class="leise">
	Wer welche Rolle hat. Vergeben und entziehen kannst du sie beim Mitglied, in der Klappe «Rollen».
</p>

{#each data.liste as eintrag (eintrag.rolle)}
	<details class="karte klappe">
		<summary class="klappe-titel"
			>{ROLLEN_NAME[eintrag.rolle]}
			<span class="leise">{anzahl(eintrag.mitglieder.length)}</span></summary
		>
		{#if eintrag.mitglieder.length === 0}
			<p class="leise">Niemand hat diese Rolle.</p>
		{:else}
			<ul>
				{#each eintrag.mitglieder as m (m.id)}
					<li>
						<a href={resolve('/verwaltung/mitglieder/[id]', { id: String(m.id) })}>{m.name}</a>
					</li>
				{/each}
			</ul>
		{/if}
	</details>
{/each}

<AnsichtWahl laufend={data.ansicht} />
