<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import Zurueck from '../../../../../lib/ui/Zurueck.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		doppelZurWahl,
		holeCmAnsicht,
		meldeAn,
		stelleAnfrage,
		sucheDoppelPartner,
		zieheAnfrageZurueck,
		type CmAnsicht,
		type CmKategorie,
		type PartnerTreffer
	} from '../../../../../lib/cm/api.ts';
	import {
		KONTAKT_HINWEIS,
		SUCHTEXT_MAX,
		doppelText,
		rueckfrageText,
		suchtextZaehlerText,
		vermerkText
	} from '../../../../../lib/cm/anzeige.ts';
	import { anredeName, nameText } from '../../../../../lib/name.ts';
	import Name from '../../../../../lib/ui/Name.svelte';
	import { MELDUNG } from '../../../../../lib/login/anmelden.ts';
	import { leiteUmNachAktion } from '../../../../../lib/login/waechter.ts';
	import { klassierungName } from '../../../../../lib/turnier/klassierung.ts';
	import { datumLang } from '../../../../../lib/verwaltung/turnier-anzeige.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// «Ansicht als …» ist nur ansehen (UI-Leitbild, Baustein Nur lesen): keine Taste, die speichert.
	const nurAnsehen = $derived(data.ansicht !== null);

	// Nach dem Speichern zeigt die Seite den neuen Stand, ohne neu zu laden.
	let cm = $derived<CmAnsicht>(data.cm);
	let k = $derived<CmKategorie>(data.kategorie);
	const sucht = $derived(k.eigen?.art === 'sucht');
	// Je Kategorie eine offene Anfrage: Solange sie steht, ist keine weitere möglich.
	const offeneAnfrage = $derived(k.meineAnfragen[0] ?? null);
	const offeneAnfrageText = $derived(
		offeneAnfrage
			? `Du hast ${nameText(offeneAnfrage.an, 'vorname-zuerst')} angefragt. Zieh die Anfrage zurück, um jemand anderen anzufragen.`
			: null
	);

	let laeuft = $state(false);
	let meldung = $state<string | null>(null);
	let fehler = $state<string | null>(null);

	// FR-48: Partnersuche ab zwei Zeichen, 250 ms nach dem letzten Tippen. Eine neue Eingabe bricht
	// die laufende Suche ab; es zählt nur die Antwort zur letzten Eingabe.
	let suche = $state('');
	const gesucht = $derived(suche.trim());
	const zuKurz = $derived(gesucht.length < 2);
	let treffer = $state<PartnerTreffer[] | null>(null);
	let suchFehler = $state(false);
	let wartet: ReturnType<typeof setTimeout> | undefined;
	let abbruch: AbortController | undefined;
	const knoepfe: Record<number, HTMLButtonElement | undefined> = {};

	/** Sucht zur aktuellen Eingabe; `sofort` ohne Wartezeit (nach einer Änderung der Anfragen). */
	function suchen(sofort = false) {
		clearTimeout(wartet);
		abbruch?.abort();
		const text = suche.trim();
		if (text.length < 2) return;
		const diese = (abbruch = new AbortController());
		wartet = setTimeout(
			async () => {
				const r = await sucheDoppelPartner(k.id, text, fetch, diese.signal);
				if (diese.signal.aborted) return;
				if (r.art === 'ok') {
					treffer = r.daten;
					suchFehler = false;
				} else if (r.art === 'abgemeldet') await leiteUmNachAktion(r);
				else suchFehler = true;
			},
			sofort ? 0 : 250
		);
	}

	onDestroy(() => {
		clearTimeout(wartet);
		abbruch?.abort();
	});

	// FR-48: Rückfrage vor dem Senden einer Anfrage.
	let rueckfrage = $state<HTMLDialogElement>();
	let ziel = $state<PartnerTreffer | null>(null);

	// FR-49: allein anmelden, mit freiwilligem Kommentar *sucht Partner*.
	let kommentar = $state('');
	let kommentarFehler = $state<string | null>(null);
	let kommentarFeld = $state<HTMLTextAreaElement>();
	let kontaktHinweis = $state<HTMLDialogElement>();

	const FEHLER = {
		voll: 'Du hast schon 3 Anmeldungen.',
		geschlossen: 'Die Anmeldung ist inzwischen geschlossen.',
		'passt-nicht': 'Diese Kategorie passt nicht zu deinen Angaben.'
	} as const;

	/**
	 * Vorgeladene Seiten (Startseite, CM-Seite beim Antippen des Zurück-Links) verfallen nach dem
	 * Speichern, damit sie den neuen Stand zeigen. `/api/cm` lädt nur die Startseite; diese Seite
	 * lädt dabei nicht neu und kann so auch keine Fehlerseite zeigen.
	 */
	const verwirfVorgeladenes = () => invalidate((url) => url.pathname === '/api/cm');

	/** Zur CM-Seite, mit der Rückmeldung dort. */
	async function zurCmSeite(rueckmeldung?: string) {
		await verwirfVorgeladenes();
		await goto(
			resolve('/clubmeisterschaft/[id]', { id: String(cm.turnier.id) }),
			rueckmeldung ? { state: { cmMeldung: rueckmeldung } } : {}
		);
	}

	/** Neuer Stand; passt die Seite nicht mehr (geschlossen, zu zweit, Angaben fehlen), zur CM-Seite. */
	async function neuLaden() {
		const r = await holeCmAnsicht(cm.turnier.id);
		if (r.art === 'ok') {
			const neu = doppelZurWahl(r.daten, k.id);
			if (neu) {
				cm = r.daten;
				k = neu;
			} else await zurCmSeite();
		} else if (r.art === 'nicht-gefunden') await goto(resolve('/'));
		else if (r.art === 'abgemeldet') await leiteUmNachAktion(r);
	}

	function anfragenTippen(t: PartnerTreffer) {
		ziel = t;
		fehler = null;
		meldung = null;
		rueckfrage?.showModal();
	}

	/** FR-48: Anfrage senden; danach zurück zur CM-Seite. */
	async function anfrageSenden() {
		const t = ziel;
		if (laeuft || !t) return;
		laeuft = true;
		const r = await stelleAnfrage(k.id, t.mitgliedId);
		laeuft = false;
		rueckfrage?.close();
		switch (r.art) {
			case 'ok':
				await zurCmSeite(`Anfrage an ${nameText(t.name, 'vorname-zuerst')} gesendet.`);
				return;
			case 'abgemeldet':
				await leiteUmNachAktion(r);
				return;
			case 'schon-angefragt':
				fehler = `Du hast ${nameText(t.name, 'vorname-zuerst')} schon angefragt.`;
				suchen(true);
				return;
			case 'anfrage-offen':
				// Nach dem Neuladen steht der Hinweis über der Trefferliste.
				await neuLaden();
				return;
			case 'passt-nicht':
			case 'nicht-gefunden':
				fehler = `${nameText(t.name, 'vorname-zuerst')} lässt sich hier nicht mehr anfragen.`;
				suchen(true);
				return;
			case 'voll':
			case 'geschlossen':
				fehler = FEHLER[r.art];
				await neuLaden();
				return;
			case 'schon-angemeldet':
			case 'angaben-fehlen':
				await neuLaden();
				return;
			default:
				fehler = MELDUNG.stoerung;
		}
	}

	/** FR-48: eigene Anfrage zurückziehen; die Seite bleibt. */
	async function zurueckziehen(t: PartnerTreffer) {
		if (laeuft || t.anfrageId === null) return;
		laeuft = true;
		meldung = null;
		fehler = null;
		const r = await zieheAnfrageZurueck(t.anfrageId);
		laeuft = false;
		switch (r.art) {
			case 'ok':
				cm = r.daten;
				await verwirfVorgeladenes();
				treffer =
					treffer?.map((x) => (x.mitgliedId === t.mitgliedId ? { ...x, anfrageId: null } : x)) ??
					null;
				meldung = `Anfrage an ${nameText(t.name, 'vorname-zuerst')} zurückgezogen.`;
				await tick();
				knoepfe[t.mitgliedId]?.focus();
				return;
			case 'abgemeldet':
				await leiteUmNachAktion(r);
				return;
			case 'geschlossen':
				fehler = FEHLER.geschlossen;
				await neuLaden();
				return;
			case 'nicht-gefunden':
				suchen(true);
				return;
			default:
				fehler = MELDUNG.stoerung;
		}
	}

	// Vor der ersten Anmeldung im Turnier: Hinweis zu den Kontaktdaten (Datenschutz).
	function alleinTippen(event: SubmitEvent) {
		event.preventDefault();
		if (laeuft) return;
		if (cm.eigene.length === 0) kontaktHinweis?.showModal();
		else void alleinAnmelden();
	}

	/** A-ANMELDUNG-04, FR-49: allein anmelden; danach zurück zur CM-Seite. */
	async function alleinAnmelden() {
		kontaktHinweis?.close();
		if (laeuft) return;
		laeuft = true;
		meldung = null;
		fehler = null;
		kommentarFehler = null;
		const r = await meldeAn(k.id, kommentar);
		laeuft = false;
		switch (r.art) {
			case 'ok':
				// Gespeichert: der Zurück-Link soll nicht mehr nach ungespeicherten Änderungen fragen.
				kommentar = '';
				await zurCmSeite(`Angemeldet für ${k.name}. Die Bestätigung kommt per Mail.`);
				return;
			case 'eingabe':
				kommentarFehler = r.felder.suchtext ?? MELDUNG.stoerung;
				await tick();
				kommentarFeld?.focus();
				return;
			case 'abgemeldet':
				await leiteUmNachAktion(r);
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
</script>

<svelte:head>
	<title>{k.name} – MyTCO</title>
</svelte:head>

<Zurueck text={cm.turnier.name} />
<h1>{k.name}</h1>
<p class="leise">{doppelText(k)} · Anmeldeschluss {datumLang(cm.turnier.anmeldeschluss)}</p>

<div role="status">
	{#if meldung}<p>{meldung}</p>{/if}
</div>
{#if fehler}
	<p class="fehler" role="alert">{fehler}</p>
{/if}

<section class="karte" aria-labelledby="mit-titel">
	<h2 id="mit-titel">Partner anfragen</h2>
	<div class="feld">
		<label for="p-suche">Partner suchen</label>
		<span class="feld-hilfe" id="p-suche-hilfe"
			>Ab zwei Buchstaben. Es erscheinen nur Mitglieder, die mit dir in diese Kategorie passen.</span
		>
		<input
			id="p-suche"
			type="search"
			bind:value={suche}
			oninput={() => suchen()}
			autocomplete="off"
			enterkeyhint="search"
			aria-describedby="p-suche-hilfe"
		/>
	</div>
	{#if offeneAnfrageText}
		<p>{offeneAnfrageText}</p>
	{/if}
	{#if !zuKurz && treffer && treffer.length > 0}
		<ul class="trefferliste" aria-label="Treffer">
			{#each treffer as t (t.mitgliedId)}
				<li class="kachel">
					<span>
						<span id="treffer-{t.mitgliedId}"><Name name={t.name} /></span
						>{#if t.klassierung}&nbsp;· {klassierungName(t.klassierung)}{/if}
						{#if t.vermerk || t.suchtPartner || t.anfrageId !== null}
							<br />
							{#if t.vermerk}<span class="plakette">{vermerkText(t.vermerk)}</span>{/if}
							{#if t.suchtPartner}<span class="plakette plakette-offen">sucht Partner</span>{/if}
							{#if t.anfrageId !== null}<span class="plakette plakette-ok">angefragt</span>{/if}
						{/if}
						{#if t.kommentar}<br /><span class="leise">«{t.kommentar}»</span>{/if}
					</span>
					{#if !nurAnsehen}
						{#if t.anfrageId !== null}
							<button
								type="button"
								class="taste-neben"
								bind:this={knoepfe[t.mitgliedId]}
								aria-describedby="treffer-{t.mitgliedId}"
								disabled={laeuft}
								onclick={() => zurueckziehen(t)}>Zurückziehen</button
							>
						{:else if !offeneAnfrage}
							<button
								type="button"
								class="taste-neben"
								bind:this={knoepfe[t.mitgliedId]}
								aria-describedby="treffer-{t.mitgliedId}"
								disabled={laeuft}
								onclick={() => anfragenTippen(t)}>Anfragen</button
							>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	<div role="status">
		{#if !zuKurz && suchFehler}
			<p class="fehler">{MELDUNG.stoerung}</p>
		{:else if !zuKurz && treffer?.length === 0}
			<p>Niemand gefunden, der mit dir passt.</p>
		{/if}
	</div>
	<p class="leise">Wer angefragt wird, nimmt an oder lehnt ab. Erst dann seid ihr angemeldet.</p>
</section>

{#if !sucht}
	<section class="karte" aria-labelledby="allein-titel">
		<h2 id="allein-titel">Noch keinen Partner?</h2>
		<p>
			Melde dich allein an. Du stehst dann in der Kategorie unter «sucht Partner», und wer mag,
			wählt dich.
		</p>
		{#if nurAnsehen}
			<fieldset disabled class="nur-lesen">
				{@render kommentarEingabe()}
			</fieldset>
		{:else}
			<form
				onsubmit={alleinTippen}
				novalidate
				data-ungespeichert={kommentar !== '' ? '' : undefined}
			>
				{@render kommentarEingabe()}
				<button type="submit" class="taste-neben" disabled={laeuft}>Allein anmelden</button>
			</form>
		{/if}
	</section>
{/if}

<dialog class="karte" bind:this={rueckfrage} aria-labelledby="rueckfrage-titel">
	<h2 id="rueckfrage-titel">
		{#if ziel}{nameText(ziel.name, 'vorname-zuerst')}{/if} anfragen?
	</h2>
	{#if ziel}
		<p>{rueckfrageText(anredeName(ziel.name))}</p>
	{/if}
	<p class="leise">
		Meldet sich später einer von euch ab, ist die ganze Doppel-Anmeldung zurückgezogen.
	</p>
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => rueckfrage?.close()}>Abbrechen</button>
		<button type="button" class="taste-haupt" disabled={laeuft} onclick={anfrageSenden}
			>Anfrage senden</button
		>
	</div>
</dialog>

<dialog class="karte" bind:this={kontaktHinweis} aria-labelledby="kontakt-titel">
	<h2 id="kontakt-titel">Bevor du dich anmeldest</h2>
	<p>{KONTAKT_HINWEIS}</p>
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => kontaktHinweis?.close()}
			>Abbrechen</button
		>
		<button type="button" class="taste-haupt" onclick={alleinAnmelden}>Anmelden</button>
	</div>
</dialog>

{#snippet kommentarEingabe()}
	<div class="feld">
		<label for="p-kommentar">Kommentar <span class="leise">(freiwillig)</span></label>
		<span class="feld-hilfe" id="p-kommentar-hinweis"
			>Alle Mitglieder sehen ihn. Bitte keine Angaben zur Gesundheit.</span
		>
		<textarea
			id="p-kommentar"
			rows="3"
			bind:this={kommentarFeld}
			maxlength={SUCHTEXT_MAX}
			bind:value={kommentar}
			aria-invalid={kommentarFehler ? 'true' : undefined}
			aria-describedby={kommentarFehler
				? 'p-kommentar-hinweis p-kommentar-zaehler p-fehler-kommentar'
				: 'p-kommentar-hinweis p-kommentar-zaehler'}></textarea>
		<span class="feld-hilfe" id="p-kommentar-zaehler">{suchtextZaehlerText(kommentar.length)}</span>
		{#if kommentarFehler}
			<p class="fehler" id="p-fehler-kommentar" role="alert">{kommentarFehler}</p>
		{/if}
	</div>
{/snippet}
