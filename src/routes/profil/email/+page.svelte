<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import {
		MELDUNG_PROFIL,
		bestaetigeWechsel,
		starteWechsel,
		type Ergebnis
	} from '../../../lib/profil/angaben.ts';
	import type { PageProps } from './$types';

	// E-Mail ändern (A-KONTO-01). Annahme K-19.1: Das Mitglied ändert die E-Mail selbst; sie gilt
	// erst, wenn es je einen Code an die bisherige und an die neue Adresse eingetippt hat.
	let { data }: PageProps = $props();

	let schritt = $state<'adresse' | 'codes'>('adresse');
	let email = $state('');
	let codeAlt = $state('');
	let codeNeu = $state('');
	let fehler = $state<string | null>(null);
	let status = $state<string | null>(null);
	let laeuft = $state(false);
	let adressfeld = $state<HTMLInputElement>();
	let codefeld = $state<HTMLInputElement>();

	function meldungFuer(r: Ergebnis): string {
		switch (r) {
			case 'gleich':
				return MELDUNG_PROFIL.gleich;
			case 'eingabe':
				return MELDUNG_PROFIL.emailUngueltig;
			case 'falsch':
				return MELDUNG_PROFIL.codesFalsch;
			case 'zu-viele':
				return MELDUNG.zuViele;
			default:
				return MELDUNG.stoerung;
		}
	}

	async function codesSenden(event: SubmitEvent) {
		event.preventDefault();
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		const r = await starteWechsel(email);
		laeuft = false;
		if (r === 'ok') {
			codeAlt = '';
			codeNeu = '';
			schritt = 'codes';
			await tick();
			codefeld?.focus();
		} else {
			fehler = meldungFuer(r);
			adressfeld?.focus();
		}
	}

	// Ein neuer Wechsel ersetzt den angefangenen: beide Adressen bekommen neue Codes.
	async function neueCodes() {
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		status = null;
		const r = await starteWechsel(email);
		laeuft = false;
		if (r === 'ok') {
			codeAlt = '';
			codeNeu = '';
			status = MELDUNG_PROFIL.neueCodes;
		} else fehler = meldungFuer(r);
		codefeld?.focus();
	}

	async function aendern(event: SubmitEvent) {
		event.preventDefault();
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		status = null;
		const r = await bestaetigeWechsel(codeAlt, codeNeu);
		if (r === 'ok') {
			await goto(resolve('/profil?email=geaendert'));
			return;
		}
		fehler = meldungFuer(r);
		laeuft = false;
		codefeld?.focus();
	}
</script>

<svelte:head>
	<title>E-Mail ändern – MyTCO</title>
</svelte:head>

<a class="zurueck" href={resolve('/profil')}>‹ Zurück</a>
<div class="zaehler">
	<div class="zaehler-balken" aria-hidden="true">
		<span class="zaehler-voll"></span><span class={{ 'zaehler-voll': schritt === 'codes' }}></span>
	</div>
	<div class="zaehler-text">
		{schritt === 'adresse' ? 'Schritt 1 von 2 · Neue Adresse' : 'Schritt 2 von 2 · Bestätigen'}
	</div>
</div>

{#if schritt === 'adresse'}
	<h1>E-Mail ändern</h1>
	<p>
		Deine E-Mail ist zugleich dein Login. Die neue gilt erst, wenn du sie mit zwei Codes bestätigt
		hast: einem an die bisherige und einem an die neue Adresse.
	</p>
	<div class="karte">
		<p><strong>Bisher</strong><br />{data.bisher}</p>
		<form onsubmit={codesSenden}>
			<div class="feld">
				<label for="neue-email">Neue E-Mail-Adresse</label>
				<input
					id="neue-email"
					type="email"
					bind:this={adressfeld}
					bind:value={email}
					required
					autocomplete="email"
					aria-invalid={fehler ? 'true' : undefined}
					aria-describedby={fehler ? 'neue-email-fehler' : undefined}
				/>
				{#if fehler}
					<p class="fehler" id="neue-email-fehler" role="alert">{fehler}</p>
				{/if}
			</div>
			<button type="submit" class="taste-haupt taste-breit">Codes senden</button>
		</form>
	</div>
	<p class="leise">
		Kommst du nicht mehr an die bisherige Adresse? Dann ändert der Admin sie für dich.
		{#if data.kontakt}Schreib an {data.kontakt}.{:else}Den Kontakt findest du in deinem Brief.{/if}
	</p>
{:else}
	<h1>Zwei Codes eintippen</h1>
	<div class="karte">
		<form onsubmit={aendern}>
			<div class="feld feld-code">
				<label for="code-alt">Code an die bisherige Adresse</label>
				<span class="feld-hilfe" id="code-alt-hilfe">{data.bisher}</span>
				<input
					id="code-alt"
					bind:this={codefeld}
					bind:value={codeAlt}
					required
					inputmode="numeric"
					autocomplete="one-time-code"
					aria-invalid={fehler ? 'true' : undefined}
					aria-describedby={fehler ? 'code-alt-hilfe codes-fehler' : 'code-alt-hilfe'}
				/>
			</div>
			<div class="feld feld-code">
				<label for="code-neu">Code an die neue Adresse</label>
				<span class="feld-hilfe" id="code-neu-hilfe">{email}</span>
				<input
					id="code-neu"
					bind:value={codeNeu}
					required
					inputmode="numeric"
					autocomplete="one-time-code"
					aria-invalid={fehler ? 'true' : undefined}
					aria-describedby={fehler ? 'code-neu-hilfe codes-fehler' : 'code-neu-hilfe'}
				/>
				{#if fehler}
					<p class="fehler" id="codes-fehler" role="alert">{fehler}</p>
				{/if}
			</div>
			<button type="submit" class="taste-haupt taste-breit">E-Mail ändern</button>
		</form>
	</div>
	<p class="leise">Die Codes gelten 15 Minuten. Keine Mail da? Schau im Spam-Ordner nach.</p>
	<p class="leise" role="status">{status ?? ''}</p>
	<button type="button" class="taste-neben" onclick={neueCodes}>Neue Codes senden</button>
{/if}
