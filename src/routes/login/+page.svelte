<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { MELDUNG, meldung, sende } from '../../lib/login/anmelden.ts';
	import { holeSpeicher, vergissMailanfrage } from '../../lib/login/mailanfrage.ts';
	import { kannPasskey, meldeMitPasskeyAn } from '../../lib/login/passkey.ts';

	let code = $state('');
	let fehler = $state<string | null>(null);
	let laeuft = $state(false);
	let feld: HTMLInputElement;
	const passkeyMoeglich = kannPasskey();
	let passkeyFehler = $state<string | null>(null);
	let passkeyLaeuft = $state(false);

	// Die Taste bleibt bedienbar, damit der Fokus nicht verloren geht; `laeuft` verhindert
	// doppeltes Abschicken.
	async function anmelden(event: SubmitEvent) {
		event.preventDefault();
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		// Der Server ignoriert Gross-/Kleinschreibung, Leerzeichen und Bindestriche (UI-07).
		const r = await sende('/api/login/brief', { code });
		if (r.art === 'ok') {
			// Eine offene Mail-Anfrage braucht es nach dem Login nicht mehr.
			vergissMailanfrage(holeSpeicher());
			await goto(resolve('/'));
			return;
		}
		fehler = meldung(r, MELDUNG.briefFalsch);
		laeuft = false;
		feld.focus();
	}

	async function mitPasskey() {
		if (passkeyLaeuft) return;
		passkeyLaeuft = true;
		passkeyFehler = null;
		const r = await meldeMitPasskeyAn();
		if (r === 'ok') {
			vergissMailanfrage(holeSpeicher());
			await goto(resolve('/'));
			return;
		}
		passkeyLaeuft = false;
		if (r === 'falsch') passkeyFehler = MELDUNG.passkeyFalsch;
		else if (r === 'zu-viele') passkeyFehler = MELDUNG.zuViele;
		else if (r === 'stoerung') passkeyFehler = MELDUNG.stoerung;
	}
</script>

<svelte:head>
	<title>Anmelden – MyTCO</title>
</svelte:head>

<h1>Anmelden</h1>

{#if passkeyMoeglich}
	<div class="karte">
		<h2>Mit Passkey</h2>
		<p>Am schnellsten: mit Face ID, Fingerabdruck oder Handy-PIN.</p>
		<button
			type="button"
			class="taste-neben taste-breit"
			onclick={mitPasskey}
			aria-describedby={passkeyFehler ? 'passkey-fehler' : undefined}>Mit Passkey anmelden</button
		>
		{#if passkeyFehler}
			<p class="fehler" id="passkey-fehler" role="alert">{passkeyFehler}</p>
		{/if}
		<p class="leise">Noch keinen? Nach dem Login richtest du ihn mit einem Tipp ein.</p>
	</div>
{/if}

<div class="karte">
	<h2>Mit Code</h2>
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
</div>
