<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		beantrageWildcard,
		holeCmAnsicht,
		lehneAnfrageAb,
		meldeAb,
		meldeAn,
		nimmAnfrageAn,
		sendeCmAngaben,
		setzeSuchtext,
		zieheAnfrageZurueck,
		type CmAnfrage,
		type CmAnsicht,
		type CmFelder,
		type CmKategorie
	} from '../../../lib/cm/api.ts';
	import {
		ANNEHMEN_HINWEIS,
		KOMMENTAR_MAX,
		KONTAKT_HINWEIS,
		SUCHTEXT_MAX,
		anmeldungenText,
		doppelText,
		kategorieText,
		kommentarZaehlerText,
		kontaktFragenText,
		standPlakette,
		suchendeText,
		suchtextZaehlerText,
		waehlbar
	} from '../../../lib/cm/anzeige.ts';
	import { anredeName, nameText, type Namensteile } from '../../../lib/name.ts';
	import Name from '../../../lib/ui/Name.svelte';
	import Zurueck from '../../../lib/ui/Zurueck.svelte';
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
	const hatDoppel = $derived(cm.kategorien.some((k) => k.art === 'doppel'));
	// FR-48: Annehmen geht nur mit allen Angaben. UI-04: Bei mehreren Anfragen ist keine Haupttaste.
	const kannAnnehmen = $derived(cm.fehlt.length === 0);
	const annehmenHaupt = $derived(cm.anfragen.length === 1);

	// FR-37: fehlende Angaben. Die Klassierung lässt sich hier zugleich setzen.
	let klassierung = $derived<string>(cm.spieler.klassierung ?? '');
	let geschlecht = $state<'w' | 'm' | null>(null);
	let jahrgang = $state('');
	let feldFehler = $state<CmFelder>({});
	let angabenForm = $state<HTMLFormElement>();
	let seitenTitel = $state<HTMLHeadingElement>();
	let angabenTitel = $state<HTMLHeadingElement>();
	// Titel der Anfrage-Karten, Ziel des Fokus, wenn eine davon verschwindet.
	const anfrageTitel: (HTMLHeadingElement | null | undefined)[] = [];
	// Ungespeichert (UI-Leitbild): eine Angabe weicht vom geladenen Stand ab.
	const geaendert = $derived(
		klassierung !== (cm.spieler.klassierung ?? '') || geschlecht !== null || jahrgang !== ''
	);

	let laeuft = $state(false);
	let meldung = $state<string | null>(null);
	let fehler = $state<string | null>(null);
	// Rückmeldung von der Anmelde-Seite des Doppels («Anfrage an … gesendet.»); erst nach dem
	// Einhängen, damit der Screenreader sie im Status-Bereich ansagt.
	onMount(() => {
		if (page.state.cmMeldung) meldung = page.state.cmMeldung;
	});
	let kontaktHinweis = $state<HTMLDialogElement>();
	let ausstehend = $state<{ k: CmKategorie; wildcard: boolean } | null>(null);
	// FR-08: Dialog für den Wildcard-Antrag.
	let wildcardDialog = $state<HTMLDialogElement>();
	let wildcardZiel = $state<CmKategorie | null>(null);
	let kommentar = $state('');
	let kommentarFehler = $state<string | null>(null);
	let kommentarFeld = $state<HTMLTextAreaElement>();
	// FR-49: Dialog für den Kommentar *sucht Partner*.
	let suchtextDialog = $state<HTMLDialogElement>();
	let suchtextZiel = $state<CmKategorie | null>(null);
	let suchtext = $state('');
	let suchtextFehler = $state<string | null>(null);
	let suchtextFeld = $state<HTMLTextAreaElement>();
	// Je Kategorie die Taste oder der Link, zu dem der Fokus nach einer Änderung geht.
	const knoepfe: Record<number, HTMLElement | undefined> = {};

	const FEHLER = {
		voll: 'Du hast schon 3 Anmeldungen.',
		'keine-wildcard': 'Für diese Kategorie geht kein Wildcard-Antrag.',
		geschlossen: 'Die Anmeldung ist inzwischen geschlossen.',
		'passt-nicht': 'Diese Kategorie passt nicht zu deinen Angaben.'
	} as const;

	// FR-48: Gründe, aus denen das Annehmen einer Anfrage scheitert.
	const ANNEHMEN_FEHLER = {
		voll: 'Einer von euch hat schon 3 Anmeldungen.',
		geschlossen: FEHLER.geschlossen,
		'passt-nicht': 'Zusammen passt ihr nicht in diese Kategorie.',
		'schon-angemeldet': 'Einer von euch hat dort inzwischen einen Partner.'
	} as const;

	/**
	 * Übernimmt die neue Ansicht nach dem Speichern. Vorgeladene Seiten (Startseite, Reiter CM)
	 * verfallen, damit ihr Zähler stimmt. Diese Seite holt `/api/cm` ungebunden (`+page.ts`),
	 * lädt dabei nicht neu und kann so auch keine Fehlerseite zeigen.
	 */
	async function uebernimm(neu: CmAnsicht) {
		cm = neu;
		await invalidate((url) => url.pathname === '/api/cm');
	}

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
				// Das Formular ist weg: Fokus zum Seitentitel, nicht in den leeren Körper der Seite.
				await tick();
				seitenTitel?.focus();
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
				await uebernimm(r.daten);
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
				await uebernimm(r.daten);
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
				await uebernimm(r.daten);
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

	/**
	 * Nach Annehmen oder Ablehnen ist die Karte der Anfrage weg (WCAG 2.4.3): Fokus zur Kategorie,
	 * sonst zur nächsten Anfrage-Karte, zum Titel der Karte *Deine Angaben* oder zum Seitentitel.
	 */
	async function fokusNachAnfrage(kategorieId?: number) {
		await tick();
		// Steht die Taste noch (die Anfrage ist geblieben), bleibt der Fokus dort.
		const aktiv = document.activeElement;
		if (aktiv instanceof HTMLElement && aktiv !== document.body && aktiv.isConnected) return;
		const ziel =
			(kategorieId !== undefined ? knoepfe[kategorieId] : undefined) ??
			anfrageTitel.find((t) => t?.isConnected) ??
			(fragtAngaben ? angabenTitel : undefined) ??
			seitenTitel;
		ziel?.focus();
	}

	/** FR-48: eine Anfrage an einen selbst annehmen. */
	async function annehmen(a: CmAnfrage) {
		if (laeuft) return;
		laeuft = true;
		meldung = null;
		fehler = null;
		const r = await nimmAnfrageAn(a.anfrageId);
		laeuft = false;
		switch (r.art) {
			case 'ok':
				await uebernimm(r.daten);
				meldung = `Angemeldet mit ${nameText(a.von, 'vorname-zuerst')} für ${a.kategorie}. Die Bestätigung kommt per Mail.`;
				await fokusNachAnfrage(a.kategorieId);
				return;
			case 'abgemeldet':
				await goto(resolve('/login'));
				return;
			case 'voll':
			case 'geschlossen':
			case 'passt-nicht':
			case 'schon-angemeldet':
				fehler = ANNEHMEN_FEHLER[r.art];
				await neuLaden();
				await fokusNachAnfrage();
				return;
			case 'hinfaellig':
				fehler = 'Diese Anfrage gilt nicht mehr.';
				await neuLaden();
				await fokusNachAnfrage();
				return;
			case 'angaben-fehlen':
			case 'nicht-gefunden':
				await neuLaden();
				await fokusNachAnfrage();
				return;
			default:
				fehler = MELDUNG.stoerung;
		}
	}

	/** FR-48: eine Anfrage an einen selbst ablehnen, ohne Grund. */
	async function ablehnen(a: CmAnfrage) {
		if (laeuft) return;
		laeuft = true;
		meldung = null;
		fehler = null;
		const r = await lehneAnfrageAb(a.anfrageId);
		laeuft = false;
		switch (r.art) {
			case 'ok':
				await uebernimm(r.daten);
				meldung = `Anfrage von ${nameText(a.von, 'vorname-zuerst')} abgelehnt.`;
				await fokusNachAnfrage();
				return;
			case 'abgemeldet':
				await goto(resolve('/login'));
				return;
			case 'geschlossen':
				fehler = FEHLER.geschlossen;
				await neuLaden();
				await fokusNachAnfrage();
				return;
			case 'nicht-gefunden':
				await neuLaden();
				await fokusNachAnfrage();
				return;
			default:
				fehler = MELDUNG.stoerung;
		}
	}

	/** FR-48: eine eigene offene Anfrage zurückziehen. */
	async function zurueckziehen(k: CmKategorie, a: CmKategorie['meineAnfragen'][number]) {
		if (laeuft) return;
		laeuft = true;
		meldung = null;
		fehler = null;
		const r = await zieheAnfrageZurueck(a.anfrageId);
		laeuft = false;
		switch (r.art) {
			case 'ok':
				await uebernimm(r.daten);
				meldung = `Anfrage an ${nameText(a.an, 'vorname-zuerst')} zurückgezogen.`;
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

	function suchtextOeffnen(k: CmKategorie) {
		suchtextZiel = k;
		suchtext = k.eigen?.art === 'sucht' ? (k.eigen.kommentar ?? '') : '';
		suchtextFehler = null;
		suchtextDialog?.showModal();
	}

	/** FR-49: Kommentar *sucht Partner* ändern; leer löscht ihn. */
	async function suchtextSenden(event: SubmitEvent) {
		event.preventDefault();
		const k = suchtextZiel;
		if (laeuft || !k || k.anmeldungId === null) return;
		laeuft = true;
		meldung = null;
		fehler = null;
		suchtextFehler = null;
		const r = await setzeSuchtext(k.anmeldungId, suchtext);
		laeuft = false;
		switch (r.art) {
			case 'ok':
				suchtextDialog?.close();
				await uebernimm(r.daten);
				meldung = 'Kommentar gespeichert.';
				await fokusBei(k.id);
				return;
			case 'eingabe':
				suchtextFehler = r.felder.suchtext ?? MELDUNG.stoerung;
				await tick();
				suchtextFeld?.focus();
				return;
			case 'abgemeldet':
				await goto(resolve('/login'));
				return;
			case 'geschlossen':
				suchtextDialog?.close();
				fehler = FEHLER.geschlossen;
				await neuLaden();
				return;
			case 'nicht-gefunden':
				suchtextDialog?.close();
				await neuLaden();
				return;
			default:
				suchtextFehler = MELDUNG.stoerung;
		}
	}
</script>

<svelte:head>
	<title>{cm.turnier.name} – MyTCO</title>
</svelte:head>

<Zurueck />
<h1 tabindex="-1" bind:this={seitenTitel}>{cm.turnier.name}</h1>
<p>
	<span class="plakette {status.klasse}">{status.text}</span><br />
	<span class="leise">Anmeldeschluss {datumLang(cm.turnier.anmeldeschluss)}</span>
</p>

<!-- FR-48: Anfragen an einen selbst stehen oben, auch über der Karte «Deine Angaben». -->
{#each cm.anfragen as a, i (a.anfrageId)}
	{@render anfrageKarte(a, i)}
{/each}

{#if fragtAngaben}
	<div role="status">
		{#if meldung}<p>{meldung}</p>{/if}
	</div>
	<section class="karte" aria-labelledby="angaben-titel">
		<h2 id="angaben-titel" tabindex="-1" bind:this={angabenTitel}>
			Deine Angaben für die Clubmeisterschaft
		</h2>
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
		{#if k.art === 'doppel'}
			{#if k.eigen?.art === 'paar'}
				{@render eigenesPaar(k, k.eigen.partner)}
			{:else if k.eigen?.art === 'sucht'}
				{@render eigeneSuche(k, k.eigen.kommentar)}
			{:else}
				{@render doppelKarte(k)}
			{/if}
		{:else}
			<div class="karte">
				{@render kopf(k, false)}
				<div class="kachel">
					<span class="leise">{kategorieText(k)}</span>
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
				{@render alleAnmeldungen(k)}
			</div>
		{/if}
	{:else}
		{#if cm.fehlt.length === 0 && wildcardSichtbar.length === 0}
			<p>Für deine Angaben gibt es keine passende Kategorie.</p>
		{/if}
	{/each}

	{#if hatDoppel}
		<p class="leise">
			Im Doppel zählt die Summe der Klassierungen (R1 = 1 … R9 = 9, keine Lizenz = 10).
		</p>
	{/if}

	{#if wildcardSichtbar.length > 0}
		<details
			class="karte klappe"
			open={!offen || istKlappeOffen('cm-wildcard')}
			ontoggle={(e) => merkeKlappe('cm-wildcard', e.currentTarget.open)}
		>
			<summary class="klappe-titel">Weitere Kategorien mit Wildcard-Antrag</summary>
			<div>
				{#each wildcardSichtbar as k (k.id)}
					<div class="karte">
						{@render kopf(k, true)}
						<div class="kachel">
							<span class="leise">{kategorieText(k)}</span>
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
						{@render alleAnmeldungen(k)}
					</div>
				{/each}
				{#if offen && voll && !nurAnsehen}
					<p class="leise">Mehr als 3 Anmeldungen gehen nicht. Melde dich zuerst irgendwo ab.</p>
				{/if}
			</div>
		</details>
	{/if}
{/if}

{#if cm.kontakt}
	<p class="leise">{kontaktFragenText(nameText(cm.kontakt, 'vorname-zuerst'))}</p>
{/if}

<dialog
	class="karte"
	bind:this={kontaktHinweis}
	aria-labelledby="kontakt-titel"
	onclose={() => (ausstehend = null)}
>
	<h2 id="kontakt-titel">Bevor du dich anmeldest</h2>
	<p>{KONTAKT_HINWEIS}</p>
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

<dialog
	class="karte"
	bind:this={suchtextDialog}
	aria-labelledby="suchtext-titel"
	onclose={() => (suchtextZiel = null)}
>
	<h2 id="suchtext-titel">Kommentar ändern</h2>
	{#if suchtextZiel}<p class="leise">{suchtextZiel.name}</p>{/if}
	<form onsubmit={suchtextSenden} novalidate>
		<div class="feld">
			<label for="cm-suchtext">Kommentar <span class="leise">(freiwillig)</span></label>
			<span class="feld-hilfe" id="cm-suchtext-hinweis"
				>Alle Mitglieder sehen ihn. Bitte keine Angaben zur Gesundheit.</span
			>
			<textarea
				id="cm-suchtext"
				rows="3"
				bind:this={suchtextFeld}
				maxlength={SUCHTEXT_MAX}
				bind:value={suchtext}
				aria-invalid={suchtextFehler ? 'true' : undefined}
				aria-describedby={suchtextFehler
					? 'cm-suchtext-hinweis cm-suchtext-zaehler cm-fehler-suchtext'
					: 'cm-suchtext-hinweis cm-suchtext-zaehler'}></textarea>
			<span class="feld-hilfe" id="cm-suchtext-zaehler">{suchtextZaehlerText(suchtext.length)}</span
			>
			{#if suchtextFehler}
				<p class="fehler" id="cm-fehler-suchtext" role="alert">{suchtextFehler}</p>
			{/if}
		</div>
		<div class="leiste">
			<button type="button" class="taste-neben" onclick={() => suchtextDialog?.close()}
				>Abbrechen</button
			>
			<button type="submit" class="taste-haupt" disabled={laeuft}>Speichern</button>
		</div>
	</form>
</dialog>

<!-- FR-48, FR-19: Anfrage an einen selbst, mit dem Kontakt des Anfragenden. -->
{#snippet anfrageKarte(a: CmAnfrage, i: number)}
	<section class="karte" aria-labelledby="anfrage-{a.anfrageId}">
		<h2 id="anfrage-{a.anfrageId}" tabindex="-1" bind:this={anfrageTitel[i]}>
			Anfrage für «{a.kategorie}»
		</h2>
		<p>
			<strong>{nameText(a.von, 'vorname-zuerst')}</strong>{#if a.klassierung}&nbsp;· {klassierungName(
					a.klassierung
				)}{/if} möchte mit dir spielen.
		</p>
		{#if a.kontakt}
			<p>
				{#if a.kontakt.art === 'telefon'}
					<a href="tel:{waehlbar(a.kontakt.wert)}">{a.kontakt.wert}</a>
				{:else}
					<a href="mailto:{a.kontakt.wert}">{a.kontakt.wert}</a>
				{/if}
			</p>
		{/if}
		{#if !offen}
			<p class="leise">Über offene Anfragen entscheidet jetzt die Turnierleitung.</p>
		{:else if !kannAnnehmen}
			<p class="leise">Trag zuerst deine Angaben ein, dann kannst du annehmen.</p>
		{:else}
			<p class="leise">{ANNEHMEN_HINWEIS}</p>
		{/if}
		{#if offen && !nurAnsehen}
			<div class="leiste">
				<button type="button" class="taste-neben" disabled={laeuft} onclick={() => ablehnen(a)}
					>Ablehnen</button
				>
				{#if kannAnnehmen}
					<button
						type="button"
						class={annehmenHaupt ? 'taste-haupt' : 'taste-neben'}
						disabled={laeuft}
						onclick={() => annehmen(a)}>Annehmen</button
					>
				{/if}
			</div>
		{/if}
	</section>
{/snippet}

<!-- A-ANMELDUNG-04: Doppel-Kategorie mit Paaren und wer einen Partner sucht. -->
{#snippet doppelKarte(k: CmKategorie)}
	<div class="karte">
		{@render kopf(k, false)}
		<div class="kachel">
			<span class="leise">{doppelText(k)}</span>
			{#if offen && !nurAnsehen}
				{#if voll}
					<button type="button" class="taste-neben" bind:this={knoepfe[k.id]} disabled
						>Anmelden</button
					>
				{:else}
					<a
						class="taste-neben"
						bind:this={knoepfe[k.id]}
						href={resolve('/clubmeisterschaft/[id]/doppel/[kid]', {
							id: String(cm.turnier.id),
							kid: String(k.id)
						})}>Anmelden</a
					>
				{/if}
			{/if}
		</div>
		{@render suchende(k)}
		{@render meineAnfragen(k)}
		{@render alleAnmeldungen(k)}
	</div>
{/snippet}

<!-- Kartenkopf (UI-Leitbild): Name links, rechts oben die Plakette mit dem eigenen Stand. -->
{#snippet kopf(k: CmKategorie, wildcard: boolean, ueberschrift = false)}
	{@const p = standPlakette(k, wildcard)}
	<div class="karte-kopf">
		{#if ueberschrift}<h2 id="doppel-{k.id}">{k.name}</h2>{:else}<strong>{k.name}</strong>{/if}
		{#if p}<span class="plakette plakette-{p.art}">{p.text}</span>{/if}
	</div>
{/snippet}

<!-- Kachel auf die Seite der Kategorie mit allen Anmeldungen. -->
{#snippet alleAnmeldungen(k: CmKategorie)}
	<a
		class="kachel karte-teil"
		href={resolve('/clubmeisterschaft/[id]/kategorie/[kid]', {
			id: String(cm.turnier.id),
			kid: String(k.id)
		})}><span>{anmeldungenText(k)}</span><span class="kachel-pfeil" aria-hidden="true">›</span></a
	>
{/snippet}

{#snippet suchende(k: CmKategorie)}
	{#if k.suchende.length > 0}
		<details
			class="klappe karte-teil"
			open={istKlappeOffen(`cm-suchende-${k.id}`)}
			ontoggle={(e) => merkeKlappe(`cm-suchende-${k.id}`, e.currentTarget.open)}
		>
			<summary class="klappe-titel">{suchendeText(k.suchende.length)}</summary>
			<div>
				{#each k.suchende as s, i (i)}
					<p>
						<Name name={s.name} />{#if s.kommentar}<br /><span class="leise">«{s.kommentar}»</span
							>{/if}
					</p>
				{/each}
			</div>
		</details>
	{/if}
{/snippet}

{#snippet meineAnfragen(k: CmKategorie)}
	{#each k.meineAnfragen as a (a.anfrageId)}
		<div class="kachel karte-teil">
			<span>
				Deine Anfrage an <strong>{nameText(a.an, 'vorname-zuerst')}</strong><br />
				<span class="plakette plakette-offen">offen</span>
			</span>
			{#if offen && !nurAnsehen}
				<button
					type="button"
					class="taste-neben"
					disabled={laeuft}
					onclick={() => zurueckziehen(k, a)}>Zurückziehen</button
				>
			{/if}
		</div>
	{/each}
{/snippet}

<!-- FR-19: eigenes Paar mit dem Kontakt des Partners. -->
{#snippet eigenesPaar(
	k: CmKategorie,
	partner: { name: Namensteile; telefon: string | null; email: string | null }
)}
	<section class="karte" aria-labelledby="doppel-{k.id}">
		{@render kopf(k, false, true)}
		<p class="leise">{doppelText(k)}</p>
		<p>Du spielst mit <strong>{nameText(partner.name, 'vorname-zuerst')}</strong>.</p>
		{#if partner.telefon || partner.email}
			<p>
				{#if partner.telefon}<a href="tel:{waehlbar(partner.telefon)}">{partner.telefon}</a>{/if}
				{#if partner.telefon && partner.email}<br />{/if}
				{#if partner.email}<a href="mailto:{partner.email}">{partner.email}</a>{/if}
			</p>
		{/if}
		{@render alleAnmeldungen(k)}
		{#if offen && !nurAnsehen}
			<div class="karte-teil">
				<p>
					<button
						type="button"
						class="taste-neben"
						bind:this={knoepfe[k.id]}
						disabled={laeuft}
						onclick={() => abmelden(k)}>Abmelden</button
					>
				</p>
				<p class="leise">
					Dann ist auch {anredeName(partner.name)} abgemeldet und bekommt eine Meldung.
				</p>
			</div>
		{/if}
	</section>
{/snippet}

<!-- A-ANMELDUNG-04, FR-49: allein angemeldet, sucht einen Partner. -->
{#snippet eigeneSuche(k: CmKategorie, kommentar: string | null)}
	<section class="karte" aria-labelledby="doppel-{k.id}">
		{@render kopf(k, false, true)}
		<p class="leise">{doppelText(k)}</p>
		<p>Du bist allein angemeldet. Wer mag, wählt dich.</p>
		{#if kommentar}
			<p class="leise">Dein Kommentar: «{kommentar}»</p>
		{/if}
		{@render meineAnfragen(k)}
		{@render suchende(k)}
		{@render alleAnmeldungen(k)}
		{#if offen && !nurAnsehen}
			<div class="leiste">
				<a
					class="taste-neben"
					href={resolve('/clubmeisterschaft/[id]/doppel/[kid]', {
						id: String(cm.turnier.id),
						kid: String(k.id)
					})}>Partner anfragen</a
				>
				<button
					type="button"
					class="taste-neben"
					disabled={laeuft}
					onclick={() => suchtextOeffnen(k)}>Kommentar ändern</button
				>
				<button
					type="button"
					class="taste-neben"
					bind:this={knoepfe[k.id]}
					disabled={laeuft}
					onclick={() => abmelden(k)}>Abmelden</button
				>
			</div>
		{/if}
	</section>
{/snippet}

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
