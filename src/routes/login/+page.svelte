<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { MELDUNG, meldung, sende } from '../../lib/login/anmelden.ts';
	import { holeSpeicher, vergissMailanfrage } from '../../lib/login/mailanfrage.ts';

	let code = $state('');
	let fehler = $state<string | null>(null);
	let laeuft = $state(false);
	let feld: HTMLInputElement;

	// Die Taste bleibt bedienbar, damit der Fokus nicht verloren geht; `laeuft` verhindert
	// doppeltes Abschicken.
	async function anmelden(event: SubmitEvent) {
		event.preventDefault();
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		// Der Server ignoriert Gross-/Kleinschreibung, Leerzeichen und Bindestriche (UI-07).
		const r = await sende('/api/login/brief', { code });
		if (r.ergebnis === 'ok') {
			// Eine offene Mail-Anfrage braucht es nach dem Login nicht mehr.
			vergissMailanfrage(holeSpeicher());
			await goto(resolve('/'));
			return;
		}
		fehler = meldung(r, MELDUNG.briefFalsch);
		laeuft = false;
		feld.focus();
	}
</script>

<svelte:head>
	<title>Anmelden – MyTCO</title>
</svelte:head>

<h1>Anmelden</h1>
<p>Tipp den Code aus deinem Brief ein.</p>

<form onsubmit={anmelden}>
	<div class="feld feld-code">
		<label for="code">Code aus dem Brief</label>
		<span class="feld-hilfe" id="code-hilfe">10 Zeichen, gross oder klein ist egal</span>
		<input
			id="code"
			bind:this={feld}
			bind:value={code}
			required
			autocomplete="one-time-code"
			autocapitalize="characters"
			spellcheck="false"
			aria-invalid={fehler ? 'true' : undefined}
			aria-describedby={fehler ? 'code-hilfe code-fehler' : 'code-hilfe'}
		/>
		{#if fehler}
			<p class="fehler" id="code-fehler" role="alert">{fehler}</p>
		{/if}
	</div>
	<button type="submit" class="taste-haupt taste-breit">Anmelden</button>
</form>

<!-- Abstand zur Taste wie im Mockup «Login» (docs/ui-mockups/index.html) -->
<p><br /><a href={resolve('/login/mail')}>Kein Brief zur Hand? Code per E-Mail</a></p>
