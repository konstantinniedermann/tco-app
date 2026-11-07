<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		erfasseAustritt,
		erfasseWiedereintritt,
		loescheMitglied,
		nimmLoeschungZurueck,
		type Antwort,
		type MitgliedDetail
	} from './api.ts';
	import { VERALTET, datumText, fehlerText, loeschungAm, wiedereintrittBis } from './anzeige.ts';
	import { leiteUm } from './umleiten.ts';

	// Karte «Mitgliedschaft»: Austritt, Wiedereintritt, Löschen und Zurücknehmen (FR-04).
	// `nurLesen`: Ansicht als … oder MyTCO-Admin; dann keine Tasten, der Link zur Auskunft bleibt.
	let { detail, nurLesen }: { detail: MitgliedDetail; nurLesen: boolean } = $props();

	const mg = $derived(detail.mitgliedschaft);
	const status = $derived(detail.status);
	// Die Löschung geht zurück in den Zustand davor; `austrittAm` bleibt bei der Vormerkung stehen.
	const davor = $derived(mg.austrittAm === null ? 'aktiv' : 'ausgetreten');
	const name = $derived(`${detail.angaben.vorname} ${detail.angaben.nachname}`);

	let austrittFrage = $state<HTMLDialogElement>();
	let loeschenFrage = $state<HTMLDialogElement>();
	// Daten der Rückfragen: nur zur Anzeige, der Server rechnet selbst.
	let frist = $state('');
	let loeschDatum = $state('');
	let fehler = $state<string | null>(null);
	let veraltet = $state(false);
	let titel = $state<HTMLHeadingElement>();
	let erledigt = $state(false);

	function frageAustritt() {
		frist = wiedereintrittBis(new Date());
		austrittFrage?.showModal();
	}
	function frageLoeschen() {
		loeschDatum = loeschungAm(new Date());
		loeschenFrage?.showModal();
	}

	// Eine Anfrage nach der anderen: ein Doppelklick schickt nicht zwei Mal.
	let laeuft = false;
	async function fuehreAus(aktion: (id: number) => Promise<Antwort<unknown>>) {
		if (laeuft) return;
		laeuft = true;
		try {
			fehler = null;
			veraltet = false;
			erledigt = false;
			const a = await aktion(detail.id);
			austrittFrage?.close();
			loeschenFrage?.close();
			if (await leiteUm(a)) return;
			if (a.art === 'ok') {
				erledigt = true;
				await invalidateAll();
				// Die Rückfrage ist zu und die Taste vielleicht weg: der Fokus geht zur Karte.
				titel?.focus();
			} else if (a.art === 'veraltet') veraltet = true;
			else if (a.art === 'letzter-mytco')
				fehler = 'Das ist der letzte MyTCO-Admin. Gib die Rolle zuerst jemand anderem.';
			else if (a.art === 'frist-abgelaufen')
				fehler = 'Die Frist für den Wiedereintritt ist vorbei. Leg das Mitglied neu an.';
			else fehler = fehlerText(a);
		} finally {
			laeuft = false;
		}
	}

	async function ladeNeuenStand() {
		veraltet = false;
		await invalidateAll();
	}
</script>

<section class="karte" aria-labelledby="mitgliedschaft-titel">
	<h2 id="mitgliedschaft-titel" tabindex="-1" bind:this={titel}>
		Mitgliedschaft
		{#if status === 'ausgetreten'}
			<span class="plakette">ausgetreten</span>
		{:else if status === 'vorgemerkt'}
			<span class="plakette plakette-gesperrt">wird gelöscht</span>
		{/if}
	</h2>

	{#if status === 'aktiv'}
		<p>
			Aktiv. Kommt der Austritt aus Fairgate, erfasse ihn hier: Das Login ist dann sofort gesperrt.
		</p>
	{:else if status === 'ausgetreten' && mg.austrittAm && mg.loeschtAm}
		<p>
			Ausgetreten am {datumText(mg.austrittAm)}. Das Login ist gesperrt. Ohne Wiedereintritt löscht
			MyTCO die Daten am <strong>{datumText(mg.loeschtAm)}</strong>; dann bleibt nur der Name.
		</p>
	{:else if status === 'vorgemerkt' && mg.vorgemerktAm && mg.loeschtAm}
		<p>
			Zum Löschen vorgemerkt am {datumText(mg.vorgemerktAm)}. Das Login ist gesperrt. MyTCO löscht
			die Daten am <strong>{datumText(mg.loeschtAm)}</strong>; dann bleibt nur der Name.
		</p>
	{/if}

	{#if !nurLesen}
		<div class="leiste">
			{#if status === 'aktiv'}
				<button type="button" class="taste-neben" onclick={frageAustritt}>Austritt erfassen</button>
				<button type="button" class="taste-neben" onclick={frageLoeschen}>Mitglied löschen</button>
			{:else if status === 'ausgetreten'}
				<button type="button" class="taste-neben" onclick={() => fuehreAus(erfasseWiedereintritt)}
					>Wiedereintritt erfassen</button
				>
				<button type="button" class="taste-neben" onclick={frageLoeschen}>Mitglied löschen</button>
			{:else if status === 'vorgemerkt'}
				<button type="button" class="taste-neben" onclick={() => fuehreAus(nimmLoeschungZurueck)}
					>Löschung rückgängig machen</button
				>
			{/if}
		</div>
		{#if status === 'vorgemerkt'}
			<p class="leise">Danach ist das Mitglied wieder {davor}, wie vorher.</p>
		{/if}
		<p class="leise" role="status">{erledigt ? 'Gespeichert.' : ''}</p>
		{#if veraltet}
			<p class="fehler" role="alert">{VERALTET}</p>
			<div class="leiste">
				<button type="button" class="taste-neben" onclick={ladeNeuenStand}>Neuen Stand laden</button
				>
			</div>
		{/if}
		{#if fehler}
			<p class="fehler" role="alert">{fehler}</p>
		{/if}
	{/if}

	<p class="leise">
		<!-- Kein Vorladen: schon das Laden schreibt «Auskunft erstellt» in den Verlauf (DS-07). -->
		<a
			href={resolve('/verwaltung/mitglieder/[id]/auskunft', { id: String(detail.id) })}
			data-sveltekit-preload-data="false">Auskunft über die Daten ›</a
		>
	</p>
</section>

<dialog class="karte" bind:this={austrittFrage} aria-labelledby="austritt-titel">
	<h2 id="austritt-titel">Austritt von {name} erfassen?</h2>
	<p>Das Login ist ab sofort gesperrt. Kommende Anmeldungen werden zurückgezogen.</p>
	<p class="leise">Ein Wiedereintritt geht bis {frist}.</p>
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => austrittFrage?.close()}
			>Abbrechen</button
		>
		<button type="button" class="taste-haupt" onclick={() => fuehreAus(erfasseAustritt)}
			>Austritt erfassen</button
		>
	</div>
</dialog>

<dialog class="karte" bind:this={loeschenFrage} aria-labelledby="loeschen-titel">
	<h2 id="loeschen-titel">{name} löschen?</h2>
	<p>
		Das Login ist ab sofort gesperrt. Kommende Anmeldungen werden zurückgezogen. Am {loeschDatum}
		löscht MyTCO die Daten; dann bleibt nur der Name.
	</p>
	<p class="leise">Bis dahin kannst du das rückgängig machen.</p>
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => loeschenFrage?.close()}
			>Abbrechen</button
		>
		<button type="button" class="taste-haupt" onclick={() => fuehreAus(loescheMitglied)}
			>Mitglied löschen</button
		>
	</div>
</dialog>
