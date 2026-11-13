<script lang="ts">
	import { tick } from 'svelte';
	import Zurueck from '../../../lib/ui/Zurueck.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		MELDUNG,
		fordereMailCodeAn,
		meldeMitMailAn,
		meldung
	} from '../../../lib/login/anmelden.ts';
	import {
		holeSpeicher,
		leseMailanfrage,
		merkeMailanfrage,
		vergissMailanfrage
	} from '../../../lib/login/mailanfrage.ts';

	const speicher = holeSpeicher();
	// Nach dem Wechsel in die Mail-App lädt das Handy die Seite oft neu: dann gleich Schritt 2.
	const gemerkt = leseMailanfrage(speicher, Date.now());

	let email = $state(gemerkt ?? '');
	let code = $state('');
	let schritt = $state<'adresse' | 'code'>(gemerkt ? 'code' : 'adresse');
	let fehler = $state<string | null>(null);
	let laeuft = $state(false);
	let adressfeld = $state<HTMLInputElement>();
	let codefeld = $state<HTMLInputElement>();

	// Nach jedem Wechsel des Schritts und nach einer Meldung steht der Fokus im passenden Feld;
	// die Tasten bleiben bedienbar (kein `disabled`), `laeuft` verhindert doppeltes Abschicken.
	async function wechsle(ziel: 'adresse' | 'code') {
		schritt = ziel;
		await tick();
		(ziel === 'code' ? codefeld : adressfeld)?.focus();
	}

	async function schicken(event: SubmitEvent) {
		event.preventDefault();
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		// Eine andere Adresse ersetzt die gemerkte Anfrage.
		if (email !== leseMailanfrage(speicher, Date.now())) vergissMailanfrage(speicher);
		const r = await fordereMailCodeAn(email);
		laeuft = false;
		if (r.art === 'ok') {
			merkeMailanfrage(speicher, email, Date.now());
			code = '';
			await wechsle('code');
		} else {
			fehler = meldung(r, MELDUNG.mailFalsch);
			adressfeld?.focus();
		}
	}

	async function anmelden(event: SubmitEvent) {
		event.preventDefault();
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		const r = await meldeMitMailAn(email, code);
		if (r.art === 'ok') {
			vergissMailanfrage(speicher);
			await goto(resolve('/'));
			return;
		}
		fehler = meldung(r, MELDUNG.mailFalsch);
		laeuft = false;
		codefeld?.focus();
	}

	function neuerCode() {
		fehler = null;
		wechsle('adresse');
	}
</script>

<svelte:head>
	<title>Code per E-Mail – MyTCO</title>
</svelte:head>

<Zurueck />
<h1>Code per E-Mail</h1>

{#if schritt === 'adresse'}
	<form onsubmit={schicken}>
		<div class="feld">
			<label for="email">E-Mail-Adresse</label>
			<input
				id="email"
				type="email"
				bind:this={adressfeld}
				bind:value={email}
				required
				autocomplete="email"
				aria-invalid={fehler ? 'true' : undefined}
				aria-describedby={fehler ? 'email-fehler' : undefined}
			/>
			{#if fehler}
				<p class="fehler" id="email-fehler" role="alert">{fehler}</p>
			{/if}
		</div>
		<button type="submit" class="taste-haupt taste-breit">Code schicken</button>
	</form>
{:else}
	<!-- Live-Region und Beschreibung des Felds: Screenreader hören den Hinweis nach dem Wechsel. -->
	<p class="hinweis" id="mail-hinweis" role="status">
		Falls ein Konto zu dieser Adresse besteht, ist eine Mail unterwegs.
	</p>
	<form onsubmit={anmelden}>
		<div class="feld feld-code">
			<label for="mailcode">Code aus der Mail</label>
			<span class="feld-hilfe" id="mailcode-hilfe">6 Ziffern</span>
			<input
				id="mailcode"
				bind:this={codefeld}
				bind:value={code}
				required
				inputmode="numeric"
				autocomplete="one-time-code"
				aria-invalid={fehler ? 'true' : undefined}
				aria-describedby={fehler
					? 'mail-hinweis mailcode-hilfe mailcode-fehler'
					: 'mail-hinweis mailcode-hilfe'}
			/>
			{#if fehler}
				<p class="fehler" id="mailcode-fehler" role="alert">{fehler}</p>
			{/if}
		</div>
		<button type="submit" class="taste-haupt taste-breit">Anmelden</button>
	</form>
	<p>
		<br /><button type="button" class="taste-neben" onclick={neuerCode}>Neuen Code schicken</button>
	</p>
{/if}
