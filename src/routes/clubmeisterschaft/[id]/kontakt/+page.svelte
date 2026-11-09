<script lang="ts">
	import { onMount, tick } from 'svelte';
	import {
		holeGespraech,
		markiereGelesen,
		sendeNachricht,
		type CmGespraech
	} from '../../../../lib/cm/api.ts';
	import { NACHRICHT_MAX, NACHRICHT_NUR_LESEN, blaseKopfText } from '../../../../lib/cm/anzeige.ts';
	import { MELDUNG } from '../../../../lib/login/anmelden.ts';
	import Zurueck from '../../../../lib/ui/Zurueck.svelte';
	import type { PageProps } from './$types';

	// Gespräch des Mitglieds mit der Turnierleitung (A-TURNIER-04, FR-50 bis FR-52). «Ansicht als …»
	// ist nur ansehen: kein Senden, und das Öffnen markiert nichts als gelesen.
	let { data }: PageProps = $props();
	const nurAnsehen = $derived(data.ansicht !== null);

	let gespraech = $derived<CmGespraech>(data.gespraech);
	let gesperrt = $state(false);
	const schreiben = $derived(gespraech.schreiben && !gesperrt && !nurAnsehen);
	// Zeigt «Schreiben geht zurzeit nicht.» nur, wenn das Mitglied sonst schreiben dürfte.
	const nurLesen = $derived(!nurAnsehen && (!gespraech.schreiben || gesperrt));

	// «neu» bleibt für diesen Besuch stehen, auch wenn die Seite die Antwort als gelesen meldet.
	const neuIds = $derived(
		new Set(data.gespraech.nachrichten.filter((n) => n.neu).map((n) => n.id))
	);

	let text = $state('');
	let laeuft = $state(false);
	let fehler = $state<string | null>(null);
	let feld = $state<HTMLTextAreaElement>();

	/** FR-52: gelesen bis zur neuesten gezeigten Nachricht; ein Fehler hier stört das Lesen nicht. */
	function nachladen() {
		const letzte = gespraech.nachrichten.at(-1);
		if (nurAnsehen || !letzte) return;
		void markiereGelesen(data.turnierId, letzte.gesendetAm);
	}

	onMount(nachladen);

	async function senden(e: SubmitEvent) {
		e.preventDefault();
		if (laeuft || !schreiben) return;
		laeuft = true;
		fehler = null;
		const r = await sendeNachricht(data.turnierId, text);
		laeuft = false;
		if (r.art === 'ok') {
			gespraech = r.daten;
			text = '';
			nachladen();
		} else if (r.art === 'eingabe') {
			fehler = r.felder.text ?? MELDUNG.stoerung;
			await tick();
			feld?.focus();
		} else if (r.art === 'nur-lesen') {
			gesperrt = true;
			const neu = await holeGespraech(data.turnierId);
			if (neu.art === 'ok') {
				gespraech = neu.daten;
				nachladen();
			}
		} else if (r.art === 'abgemeldet') {
			window.location.assign('/login');
		} else {
			fehler = MELDUNG.stoerung;
		}
	}
</script>

<svelte:head>
	<title>Frage an die Turnierleitung – MyTCO</title>
</svelte:head>

<Zurueck text={gespraech.turnier.name} />
<h1>Frage an die Turnierleitung</h1>

{#if gespraech.nachrichten.length > 0}
	<ol class="verlauf" aria-label="Verlauf">
		{#each gespraech.nachrichten as n (n.id)}
			<li class="blase {n.von === 'du' ? 'blase-eigen' : 'blase-leitung'}">
				<span class="blase-kopf"
					>{blaseKopfText(n.von, n.gesendetAm)}{#if neuIds.has(n.id)}
						<span class="plakette plakette-offen">neu</span>{/if}</span
				>
				<p>{n.text}</p>
			</li>
		{/each}
	</ol>
{/if}

{#if schreiben}
	<form onsubmit={senden} novalidate>
		<div class="feld">
			<label for="nachricht">Deine Nachricht</label>
			<span class="feld-hilfe" id="nachricht-hilfe"
				>Alle CM-Admins lesen mit. Bitte keine Angaben zur Gesundheit.</span
			>
			<textarea
				id="nachricht"
				rows="3"
				bind:this={feld}
				bind:value={text}
				maxlength={NACHRICHT_MAX}
				required
				aria-invalid={fehler ? 'true' : undefined}
				aria-describedby={fehler ? 'nachricht-hilfe nachricht-fehler' : 'nachricht-hilfe'}
			></textarea>
			{#if fehler}
				<p class="fehler" id="nachricht-fehler" role="alert">{fehler}</p>
			{/if}
		</div>
		<button type="submit" class="taste-haupt" disabled={laeuft}>Senden</button>
	</form>
{:else if nurLesen}
	<p class="leise">{NACHRICHT_NUR_LESEN}</p>
{/if}
