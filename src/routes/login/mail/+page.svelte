<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { MELDUNG, meldung, sende } from '../../../lib/login/anmelden.ts';
	import {
		leseMailanfrage,
		merkeMailanfrage,
		vergissMailanfrage
	} from '../../../lib/login/mailanfrage.ts';

	// Schon der Zugriff auf localStorage kann werfen (gesperrter Speicher); dann ohne Speicher.
	function holeSpeicher(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
		try {
			return localStorage;
		} catch {
			return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
		}
	}

	const speicher = holeSpeicher();
	// Nach dem Wechsel in die Mail-App lädt das Handy die Seite oft neu: dann gleich Schritt 2.
	const gemerkt = leseMailanfrage(speicher, Date.now());

	let email = $state(gemerkt ?? '');
	let code = $state('');
	let schritt = $state<'adresse' | 'code'>(gemerkt ? 'code' : 'adresse');
	let fehler = $state<string | null>(null);
	let laeuft = $state(false);

	async function schicken(event: SubmitEvent) {
		event.preventDefault();
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		// Eine andere Adresse ersetzt die gemerkte Anfrage.
		if (email !== leseMailanfrage(speicher, Date.now())) vergissMailanfrage(speicher);
		const r = await sende('/api/login/mail-code', { email });
		if (r.ergebnis === 'ok') {
			merkeMailanfrage(speicher, email, Date.now());
			code = '';
			schritt = 'code';
		} else {
			fehler = meldung(r, MELDUNG.mailFalsch);
		}
		laeuft = false;
	}

	async function anmelden(event: SubmitEvent) {
		event.preventDefault();
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		const r = await sende('/api/login/mail', { email, code });
		if (r.ergebnis === 'ok') {
			vergissMailanfrage(speicher);
			await goto(resolve('/'));
			return;
		}
		fehler = meldung(r, MELDUNG.mailFalsch);
		laeuft = false;
	}

	function neuerCode() {
		fehler = null;
		schritt = 'adresse';
	}
</script>

<svelte:head>
	<title>Code per E-Mail – MyTCO</title>
</svelte:head>

<a class="zurueck" href={resolve('/login')}>‹ Zurück</a>
<h1>Code per E-Mail</h1>

{#if schritt === 'adresse'}
	<form onsubmit={schicken}>
		<div class="feld">
			<label for="email">E-Mail-Adresse</label>
			<input
				id="email"
				type="email"
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
		<button type="submit" class="taste-haupt taste-breit" disabled={laeuft}>Code schicken</button>
	</form>
{:else}
	<p class="hinweis">Falls ein Konto zu dieser Adresse besteht, ist eine Mail unterwegs.</p>
	<form onsubmit={anmelden}>
		<div class="feld feld-code">
			<label for="mailcode">Code aus der Mail</label>
			<span class="feld-hilfe" id="mailcode-hilfe">6 Ziffern</span>
			<input
				id="mailcode"
				bind:value={code}
				required
				inputmode="numeric"
				autocomplete="one-time-code"
				aria-invalid={fehler ? 'true' : undefined}
				aria-describedby={fehler ? 'mailcode-hilfe mailcode-fehler' : 'mailcode-hilfe'}
			/>
			{#if fehler}
				<p class="fehler" id="mailcode-fehler" role="alert">{fehler}</p>
			{/if}
		</div>
		<button type="submit" class="taste-haupt taste-breit" disabled={laeuft}>Anmelden</button>
	</form>
	<p>
		<br /><button type="button" class="taste-neben" onclick={neuerCode}>Neuen Code schicken</button>
	</p>
{/if}
