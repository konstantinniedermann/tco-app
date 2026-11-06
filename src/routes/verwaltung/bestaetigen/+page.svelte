<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import { bestaetige, fordereCodeAn } from '../../../lib/verwaltung/api.ts';
	import { leiteUm, startziel } from '../../../lib/verwaltung/umleiten.ts';

	let { data } = $props();
	let schritt = $state<'start' | 'code'>('start');
	let code = $state('');
	let fehler = $state<string | null>(null);
	let laeuft = $state(false);
	let codefeld = $state<HTMLInputElement>();

	// Die Taste bleibt bedienbar, `laeuft` verhindert doppeltes Abschicken.
	async function schicken() {
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		const a = await fordereCodeAn();
		laeuft = false;
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			code = '';
			schritt = 'code';
			await tick();
			codefeld?.focus();
		} else {
			fehler = a.art === 'zu-viele' ? MELDUNG.zuViele : MELDUNG.stoerung;
		}
	}

	async function pruefen(event: SubmitEvent) {
		event.preventDefault();
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		const a = await bestaetige(code);
		if (a.art === 'ok') {
			// Eine vorgeladene Seite (Tippen auf einen Link) kennt die Bestätigung noch nicht.
			await goto(resolve(startziel(data.rollen)), { invalidateAll: true });
			return;
		}
		laeuft = false;
		if (await leiteUm(a)) return;
		fehler = a.art === 'falsch' ? MELDUNG.mailFalsch : MELDUNG.stoerung;
		codefeld?.focus();
	}
</script>

<svelte:head>
	<title>Verwaltung öffnen – MyTCO</title>
</svelte:head>

<h1>Verwaltung öffnen</h1>
<p>Zum Schutz der Mitgliederdaten bestätigst du einmal am Tag mit einem Code per E-Mail.</p>

{#if schritt === 'start'}
	<div class="karte">
		<button
			type="button"
			class="taste-haupt taste-breit"
			onclick={schicken}
			aria-describedby={fehler ? 'bestaetigen-fehler' : undefined}>Code schicken</button
		>
		{#if fehler}
			<p class="fehler" id="bestaetigen-fehler" role="alert">{fehler}</p>
		{/if}
	</div>
{:else}
	<form class="karte" onsubmit={pruefen}>
		<div class="feld feld-code">
			<label for="code">Code aus der Mail</label>
			<input
				id="code"
				bind:this={codefeld}
				bind:value={code}
				inputmode="numeric"
				autocomplete="one-time-code"
				aria-invalid={fehler ? 'true' : undefined}
				aria-describedby={fehler ? 'bestaetigen-fehler' : undefined}
			/>
			{#if fehler}
				<p class="fehler" id="bestaetigen-fehler" role="alert">{fehler}</p>
			{/if}
		</div>
		<button type="submit" class="taste-haupt taste-breit">Bestätigen</button>
		<p>
			<button type="button" class="taste-neben taste-breit" onclick={schicken}
				>Neuen Code schicken</button
			>
		</p>
	</form>
{/if}
