<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		beantrageWildcard,
		holeCmAnsicht,
		meldeAb,
		meldeAn,
		sendeCmAngaben,
		type CmAnsicht,
		type CmFelder,
		type CmKategorie
	} from '../../../lib/cm/api.ts';
	import {
		KOMMENTAR_MAX,
		kategorieText,
		kommentarZaehlerText,
		namenText
	} from '../../../lib/cm/anzeige.ts';
	import { istKlappeOffen, merkeKlappe } from '../../../lib/ui/klappe.ts';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import { KLASSIERUNGEN, klassierungName } from '../../../lib/turnier/klassierung.ts';
	import { datumLang, statusText } from '../../../lib/verwaltung/turnier-anzeige.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// «Ansicht als …» ist nur ansehen (UI-Leitbild, Baustein Nur lesen): keine Taste, die speichert.
	const nurAnsehen = $derived(data.ansicht !== null);

	// Nach Angaben, An- oder Abmelden zeigt die Seite die neue Ansicht, ohne neu zu laden.
	let cm = $derived<CmAnsicht>(data.cm);
	const offen = $derived(cm.turnier.status === 'offen');
	const status = $derived(statusText(cm.turnier.status));
	const anzahl = $derived(cm.eigene.length);
	const voll = $derived(anzahl >= cm.grenze);
	// FR-08: Nach dem Anmeldeschluss bleiben nur die laufenden Anträge zu sehen (ohne Tasten).
	const wildcardSichtbar = $derived(
		offen ? cm.wildcard : cm.wildcard.filter((k) => k.anmeldungId !== null)
	);
	const fragtAngaben = $derived(cm.fehlt.length > 0 && offen);

	// FR-37: fehlende Angaben. Die Klassierung lässt sich hier zugleich setzen.
	let klassierung = $derived<string>(cm.spieler.klassierung ?? '');
	let geschlecht = $state<'w' | 'm' | null>(null);
	let jahrgang = $state('');
	let feldFehler = $state<CmFelder>({});
	let angabenForm = $state<HTMLFormElement>();
	let zaehlerBereich = $state<HTMLDivElement>();
	// Ungespeichert (UI-Leitbild): eine Angabe weicht vom geladenen Stand ab.
	const geaendert = $derived(
		klassierung !== (cm.spieler.klassierung ?? '') || geschlecht !== null || jahrgang !== ''
	);

	let laeuft = $state(false);
	let meldung = $state<string | null>(null);
	let fehler = $state<string | null>(null);
	let kontaktHinweis = $state<HTMLDialogElement>();
	let ausstehend = $state<{ k: CmKategorie; wildcard: boolean } | null>(null);
	// FR-08: Dialog für den Wildcard-Antrag.
	let wildcardDialog = $state<HTMLDialogElement>();
	let wildcardZiel = $state<CmKategorie | null>(null);
	let kommentar = $state('');
	let kommentarFehler = $state<string | null>(null);
	let kommentarFeld = $state<HTMLTextAreaElement>();
	const knoepfe: Record<number, HTMLButtonElement | undefined> = {};

	const FEHLER = {
		voll: 'Du hast schon 3 Anmeldungen.',
		'keine-wildcard': 'Für diese Kategorie geht kein Wildcard-Antrag.',
		geschlossen: 'Die Anmeldung ist inzwischen geschlossen.',
		'passt-nicht': 'Diese Kategorie passt nicht zu deinen Angaben.'
	} as const;

	/** Gibt zurück, ob die neue Ansicht geladen ist; Weiterleitungen erledigt sie selbst. */
	async function neuLaden(): Promise<boolean> {
		const r = await holeCmAnsicht(cm.turnier.id);
		if (r.art === 'ok') {
			cm = r.daten;
			return true;
		}
		if (r.art === 'nicht-gefunden') await goto(resolve('/'));
		else if (r.art === 'abgemeldet') await goto(resolve('/login'));
		return false;
	}

	async function angabenSenden(event: SubmitEvent) {
		event.preventDefault();
		if (laeuft) return;
		laeuft = true;
		feldFehler = {};
		fehler = null;
		const r = await sendeCmAngaben({
			klassierung,
			...(cm.fehlt.includes('geschlecht') ? { geschlecht: geschlecht ?? '' } : {}),
			...(cm.fehlt.includes('jahrgang') ? { jahrgang } : {})
		});
		if (r.art === 'ok') {
			const geladen = await neuLaden();
			if (geladen) {
				// Das Formular ist weg: Fokus zum Zähler, nicht in den leeren Körper der Seite.
				await tick();
				zaehlerBereich?.focus();
			} else fehler = MELDUNG.stoerung;
		} else if (r.art === 'eingabe') {
			feldFehler = r.felder;
			await tick();
			const erstes = (['klassierung', 'geschlecht', 'jahrgang'] as const).find((f) => r.felder[f]);
			if (erstes) angabenForm?.querySelector<HTMLElement>(`[data-feld="${erstes}"]`)?.focus();
		} else if (r.art === 'abgemeldet') await goto(resolve('/login'));
		else fehler = MELDUNG.stoerung;
		laeuft = false;
	}

	// Vor der ersten Anmeldung im Turnier: Hinweis zu den Kontaktdaten (Datenschutz).
	function anmeldenTippen(k: CmKategorie) {
		if (cm.eigene.length === 0) {
			ausstehend = { k, wildcard: false };
			kontaktHinweis?.showModal();
		} else void anmelden(k);
	}

	function wildcardTippen(k: CmKategorie) {
		if (cm.eigene.length === 0) {
			ausstehend = { k, wildcard: true };
			kontaktHinweis?.showModal();
		} else wildcardOeffnen(k);
	}

	function hinweisBestaetigen() {
		const a = ausstehend;
		kontaktHinweis?.close();
		if (!a) return;
		if (a.wildcard) wildcardOeffnen(a.k);
		else void anmelden(a.k);
	}

	function wildcardOeffnen(k: CmKategorie) {
		wildcardZiel = k;
		kommentar = '';
		kommentarFehler = null;
		wildcardDialog?.showModal();
	}

	async function wildcardSenden(event: SubmitEvent) {
		event.preventDefault();
		const k = wildcardZiel;
		if (laeuft || !k) return;
		if (kommentar.trim() === '') {
			kommentarFehler = 'Bitte schreib kurz, warum du hier spielen möchtest.';
			await tick();
			kommentarFeld?.focus();
			return;
		}
		laeuft = true;
		meldung = null;
		fehler = null;
		kommentarFehler = null;
		const r = await beantrageWildcard(k.id, kommentar);
		laeuft = false;
		switch (r.art) {
			case 'ok':
				cm = r.daten;
				wildcardDialog?.close();
				meldung = 'Wildcard beantragt. Du bekommst Bescheid.';
				await fokusBei(k.id);
				return;
			case 'eingabe':
				kommentarFehler = r.felder.kommentar ?? MELDUNG.stoerung;
				await tick();
				kommentarFeld?.focus();
				return;
			case 'abgemeldet':
				await goto(resolve('/login'));
				return;
			case 'voll':
			case 'geschlossen':
			case 'keine-wildcard':
			case 'passt-nicht':
				wildcardDialog?.close();
				fehler = FEHLER[r.art];
				await neuLaden();
				return;
			case 'schon-angemeldet':
			case 'angaben-fehlen':
			case 'nicht-gefunden':
				wildcardDialog?.close();
				await neuLaden();
				return;
			default:
				kommentarFehler = MELDUNG.stoerung;
		}
	}

	// Nach dem Wechsel der Taste (Anmelden ↔ Abmelden) bleibt der Fokus bei der Kategorie.
	async function fokusBei(id: number) {
		await tick();
		knoepfe[id]?.focus();
	}

	async function anmelden(k: CmKategorie) {
		if (laeuft) return;
		laeuft = true;
		meldung = null;
		fehler = null;
		const r = await meldeAn(k.id);
		laeuft = false;
		switch (r.art) {
			case 'ok':
				cm = r.daten;
				meldung = `Angemeldet für ${k.name}. Die Bestätigung kommt per Mail.`;
				await fokusBei(k.id);
				return;
			case 'abgemeldet':
				await goto(resolve('/login'));
				return;
			case 'voll':
			case 'geschlossen':
			case 'passt-nicht':
				fehler = FEHLER[r.art];
				await neuLaden();
				return;
			case 'schon-angemeldet':
			case 'angaben-fehlen':
			case 'nicht-gefunden':
				await neuLaden();
				return;
			default:
				fehler = MELDUNG.stoerung;
		}
	}

	async function abmelden(k: CmKategorie, wildcard = false) {
		if (laeuft || k.anmeldungId === null) return;
		laeuft = true;
		meldung = null;
		fehler = null;
		const r = await meldeAb(k.anmeldungId);
		laeuft = false;
		switch (r.art) {
			case 'ok':
				cm = r.daten;
				meldung = wildcard ? `Antrag für ${k.name} zurückgezogen.` : `Abgemeldet von ${k.name}.`;
				await fokusBei(k.id);
				return;
			case 'abgemeldet':
				await goto(resolve('/login'));
				return;
			case 'geschlossen':
				fehler = FEHLER.geschlossen;
				await neuLaden();
				return;
			case 'nicht-gefunden':
				await neuLaden();
				return;
			default:
				fehler = MELDUNG.stoerung;
		}
	}
</script>

<svelte:head>
	<title>{cm.turnier.name} – MyTCO</title>
</svelte:head>

<a class="zurueck" href={resolve('/')}>‹ Zurück</a>
<h1>{cm.turnier.name}</h1>
<p>
	<span class="plakette {status.klasse}">{status.text}</span><br />
	<span class="leise">Anmeldeschluss {datumLang(cm.turnier.anmeldeschluss)}</span>
</p>

{#if fragtAngaben}
	<section class="karte" aria-labelledby="angaben-titel">
		<h2 id="angaben-titel">Deine Angaben für die Clubmeisterschaft</h2>
		<p>Damit MyTCO dir die passenden Kategorien zeigt, braucht es noch:</p>
		{#if nurAnsehen}
			<fieldset disabled class="nur-lesen">
				{@render angabenFelder()}
			</fieldset>
		{:else}
			<form
				bind:this={angabenForm}
				onsubmit={angabenSenden}
				novalidate
				data-ungespeichert={geaendert ? '' : undefined}
			>
				{@render angabenFelder()}
				<button type="submit" class="taste-haupt taste-breit" disabled={laeuft}
					>Weiter zu den Kategorien</button
				>
				{#if fehler}
					<p class="fehler" role="alert">{fehler}</p>
				{/if}
			</form>
		{/if}
	</section>
{:else}
	<div class="zaehler" bind:this={zaehlerBereich} tabindex="-1">
		<div class="zaehler-balken" aria-hidden="true">
			{#each { length: cm.grenze }, i (i)}
				<span class={{ 'zaehler-voll': i < anzahl }}></span>
			{/each}
		</div>
		<div class="zaehler-text">{anzahl} von {cm.grenze} Anmeldungen</div>
	</div>
	{#if offen && voll && !nurAnsehen}
		<p class="leise">Mehr als 3 Anmeldungen gehen nicht. Melde dich zuerst irgendwo ab.</p>
	{/if}

	<div role="status">
		{#if meldung}<p>{meldung}</p>{/if}
	</div>
	{#if fehler}
		<p class="fehler" role="alert">{fehler}</p>
	{/if}

	{#if !offen}
		<p>Die Anmeldung ist geschlossen. Änderungen macht jetzt die Turnierleitung.</p>
	{/if}

	{#each cm.kategorien as k (k.id)}
		<div class="karte kachel">
			<span>
				<strong>{k.name}</strong><br />
				<span class="leise">{kategorieText(k)}</span><br />
				<span class="leise">{namenText(k.namen)}</span>
				{#if k.anmeldungId !== null}<br /><span class="leise">Du bist angemeldet.</span>{/if}
			</span>
			{#if offen && !nurAnsehen}
				{#if k.anmeldungId !== null}
					<button
						type="button"
						class="taste-neben"
						bind:this={knoepfe[k.id]}
						disabled={laeuft}
						onclick={() => abmelden(k)}>Abmelden</button
					>
				{:else}
					<button
						type="button"
						class="taste-neben"
						bind:this={knoepfe[k.id]}
						disabled={laeuft || voll}
						onclick={() => anmeldenTippen(k)}>Anmelden</button
					>
				{/if}
			{/if}
		</div>
	{:else}
		{#if cm.fehlt.length === 0 && wildcardSichtbar.length === 0}
			<p>Für deine Angaben gibt es keine passende Kategorie.</p>
		{/if}
	{/each}

	{#if wildcardSichtbar.length > 0}
		<details
			class="karte klappe"
			open={!offen || istKlappeOffen('cm-wildcard')}
			ontoggle={(e) => merkeKlappe('cm-wildcard', e.currentTarget.open)}
		>
			<summary class="klappe-titel">Weitere Kategorien mit Wildcard-Antrag</summary>
			<div>
				{#each wildcardSichtbar as k (k.id)}
					<div class="karte kachel">
						<span>
							<strong>{k.name}</strong><br />
							<span class="leise">{kategorieText(k)}</span><br />
							<span class="leise">{namenText(k.namen)}</span>
							{#if k.anmeldungId !== null}<br /><span class="plakette plakette-offen"
									>Wildcard beantragt</span
								>{/if}
						</span>
						{#if offen && !nurAnsehen}
							{#if k.anmeldungId !== null}
								<button
									type="button"
									class="taste-neben"
									bind:this={knoepfe[k.id]}
									disabled={laeuft}
									onclick={() => abmelden(k, true)}>Zurückziehen</button
								>
							{:else}
								<button
									type="button"
									class="taste-neben"
									bind:this={knoepfe[k.id]}
									disabled={laeuft || voll}
									onclick={() => wildcardTippen(k)}>Wildcard beantragen</button
								>
							{/if}
						{/if}
					</div>
				{/each}
				{#if offen && voll && !nurAnsehen}
					<p class="leise">Mehr als 3 Anmeldungen gehen nicht. Melde dich zuerst irgendwo ab.</p>
				{/if}
			</div>
		</details>
	{/if}
{/if}

<dialog
	class="karte"
	bind:this={kontaktHinweis}
	aria-labelledby="kontakt-titel"
	onclose={() => (ausstehend = null)}
>
	<h2 id="kontakt-titel">Bevor du dich anmeldest</h2>
	<p>
		Deine Gegner sehen während der Clubmeisterschaft deine E-Mail-Adresse und Telefonnummer, damit
		ihr die Spiele selbst abmachen könnt. Verbergen geht nicht.
	</p>
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => kontaktHinweis?.close()}
			>Abbrechen</button
		>
		<button type="button" class="taste-haupt" onclick={hinweisBestaetigen}
			>{ausstehend?.wildcard ? 'Weiter' : 'Anmelden'}</button
		>
	</div>
</dialog>

<dialog
	class="karte"
	bind:this={wildcardDialog}
	aria-labelledby="wildcard-titel"
	onclose={() => (wildcardZiel = null)}
>
	<h2 id="wildcard-titel">Wildcard beantragen</h2>
	{#if wildcardZiel}<p class="leise">{wildcardZiel.name}</p>{/if}
	<form onsubmit={wildcardSenden} novalidate>
		<div class="feld">
			<label for="cm-kommentar">Warum möchtest du hier spielen?</label>
			<span class="feld-hilfe" id="cm-kommentar-hinweis"
				>Bitte keine Angaben zur Gesundheit. Den Kommentar sehen nur du, die CM-Admins und wer MyTCO
				technisch betreut.</span
			>
			<textarea
				id="cm-kommentar"
				rows="4"
				bind:this={kommentarFeld}
				maxlength={KOMMENTAR_MAX}
				bind:value={kommentar}
				required
				aria-invalid={kommentarFehler ? 'true' : undefined}
				aria-describedby={kommentarFehler
					? 'cm-kommentar-hinweis cm-kommentar-hilfe cm-fehler-kommentar'
					: 'cm-kommentar-hinweis cm-kommentar-hilfe'}></textarea>
			<span class="feld-hilfe" id="cm-kommentar-hilfe"
				>{kommentarZaehlerText(kommentar.length)}</span
			>
			{#if kommentarFehler}
				<p class="fehler" id="cm-fehler-kommentar" role="alert">{kommentarFehler}</p>
			{/if}
		</div>
		<div class="leiste">
			<button type="button" class="taste-neben" onclick={() => wildcardDialog?.close()}
				>Abbrechen</button
			>
			<button type="submit" class="taste-haupt" disabled={laeuft}>Beantragen</button>
		</div>
	</form>
</dialog>

{#snippet angabenFelder()}
	<div class="feld">
		<label for="cm-klassierung">Klassierung</label>
		<span class="feld-hilfe" id="cm-klassierung-hilfe"
			>Steht auf deiner Lizenz bei Swiss Tennis. Ohne Lizenz: keine Lizenz.</span
		>
		<select
			id="cm-klassierung"
			data-feld="klassierung"
			bind:value={klassierung}
			aria-invalid={feldFehler.klassierung ? 'true' : undefined}
			aria-describedby={feldFehler.klassierung
				? 'cm-klassierung-hilfe cm-fehler-klassierung'
				: 'cm-klassierung-hilfe'}
		>
			<option value="">–</option>
			{#each KLASSIERUNGEN as k (k)}
				<option value={k}>{klassierungName(k)}</option>
			{/each}
		</select>
		{#if feldFehler.klassierung}
			<p class="fehler" id="cm-fehler-klassierung">{feldFehler.klassierung}</p>
		{/if}
	</div>
	{#if cm.fehlt.includes('geschlecht')}
		<!-- `aria-invalid` gilt für die Gruppe, nicht für einzelne Radios (ARIA). -->
		<fieldset
			class="auswahl-gruppe"
			role="radiogroup"
			aria-invalid={feldFehler.geschlecht ? 'true' : undefined}
			aria-describedby={feldFehler.geschlecht ? 'cm-fehler-geschlecht' : undefined}
		>
			<legend>Geschlecht</legend>
			<label class="auswahl">
				<input
					type="radio"
					name="geschlecht"
					value="w"
					data-feld="geschlecht"
					bind:group={geschlecht}
				/>Frau
			</label>
			<label class="auswahl">
				<input type="radio" name="geschlecht" value="m" bind:group={geschlecht} />Mann
			</label>
		</fieldset>
		{#if feldFehler.geschlecht}
			<p class="fehler" id="cm-fehler-geschlecht">{feldFehler.geschlecht}</p>
		{/if}
	{/if}
	{#if cm.fehlt.includes('jahrgang')}
		<div class="feld">
			<label for="cm-jahrgang">Jahrgang</label>
			<input
				id="cm-jahrgang"
				data-feld="jahrgang"
				bind:value={jahrgang}
				inputmode="numeric"
				autocomplete="bday-year"
				maxlength="4"
				aria-invalid={feldFehler.jahrgang ? 'true' : undefined}
				aria-describedby={feldFehler.jahrgang ? 'cm-fehler-jahrgang' : undefined}
			/>
			{#if feldFehler.jahrgang}
				<p class="fehler" id="cm-fehler-jahrgang">{feldFehler.jahrgang}</p>
			{/if}
		</div>
	{/if}
	{#if cm.fehlt.includes('geschlecht') || cm.fehlt.includes('jahrgang')}
		<p class="leise">Geschlecht und Jahrgang ändert danach nur die Mitgliederverwaltung.</p>
	{/if}
{/snippet}
