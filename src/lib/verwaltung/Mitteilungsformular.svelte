<script lang="ts">
	import { tick } from 'svelte';
	import { ANLASS_AUSWAHLEN } from '../mitteilung/auswahl.ts';
	import { MAX_TEXT, MAX_TITEL } from '../mitteilung/vorlagen.ts';
	import type { Antwort } from './api.ts';
	import { fehlerText } from './anzeige.ts';
	import {
		AUSWAHL_NAMEN,
		gleicheWerte,
		VORLAGE_NAMEN,
		WEG_NAMEN,
		WEGE,
		rueckfrageText,
		sendeMitteilung,
		vorschauZeilen,
		zahlenText,
		zeigeVorschau,
		type Bezug,
		type MitteilungFeld,
		type MitteilungWerte,
		type Vorlage,
		type Vorschau,
		type Weg
	} from './mitteilung-api.ts';
	import { leiteUm } from './umleiten.ts';

	type Props = {
		bezug: Bezug;
		/** Vorlagen des Anlasses (Spec Ziel 7); beim Verein leer, dann gleich das leere Formular. */
		vorlagen: Vorlage[];
		/** «Neue Mitteilung» und «Senden» als Haupttaste; nicht, wo die Seite schon eine hat (UI-04). */
		haupt?: boolean;
		/** Stufe der Überschrift «Neue Mitteilung»: 3 unter einem Abschnitt, 2 direkt unter dem Seitentitel. */
		stufe?: 2 | 3;
		/** Nach dem Senden, auch nach einer Störung (dann kann sie schon draussen sein): Die Seite lädt den Verlauf neu. */
		onverlauf: () => void;
	};
	let { bezug, vorlagen, haupt = false, stufe = 3, onverlauf }: Props = $props();

	const REIHE: MitteilungFeld[] = ['titel', 'text', 'auswahl', 'weg'];

	let schritt = $state<'zu' | 'vorlage' | 'formular'>('zu');
	let start = $state({ titel: '', text: '' });
	let titel = $state('');
	let text = $state('');
	let auswahl = $state('alle');
	let weg = $state<Weg>('push-sonst-mail');
	// FR-43: Die Vorschau gilt nur für die Werte, mit denen sie geholt wurde (`werte`); jede Eingabe
	// danach verwirft sie, und gesendet werden genau diese Werte.
	let vorschau = $state<{ werte: MitteilungWerte; daten: Vorschau } | null>(null);
	let fehler = $state<Partial<Record<MitteilungFeld, string>>>({});
	let allgemein = $state<string | null>(null);
	let ergebnis = $state<string | null>(null);
	let laeuft = $state<'vorschau' | 'senden' | null>(null);
	let formular = $state<HTMLFormElement>();
	let rueckfrage = $state<HTMLDialogElement>();

	const ungespeichert = $derived(
		schritt === 'formular' && (titel !== start.titel || text !== start.text)
	);
	const gueltig = $derived(
		vorschau !== null && gleicheWerte(vorschau.werte, { titel, text, auswahl, weg })
			? vorschau.daten
			: null
	);
	const senden = $derived(gueltig !== null && gueltig.anzahl > 0 && laeuft === null);
	const knopfHaupt = $derived(haupt ? 'taste-haupt' : 'taste-neben');

	async function oeffne(v: Vorlage | null) {
		start = { titel: v?.titel ?? '', text: v?.text ?? '' };
		titel = start.titel;
		text = start.text;
		// Die Erinnerung geht an alle, die noch nicht geantwortet haben.
		auswahl = v?.art === 'erinnerung' ? 'keine-antwort' : 'alle';
		weg = 'push-sonst-mail';
		vorschau = null;
		fehler = {};
		allgemein = null;
		ergebnis = null;
		schritt = 'formular';
		await tick();
		formular?.querySelector<HTMLElement>('#mitteilung-titel')?.focus();
	}

	function neu() {
		ergebnis = null;
		if (vorlagen.length === 0) oeffne(null);
		else schritt = 'vorlage';
	}

	function schliesse() {
		schritt = 'zu';
		vorschau = null;
	}

	const werte = (): MitteilungWerte => ({ titel, text, auswahl, weg });

	const NACH_STOERUNG =
		'Das hat nicht geklappt. Die Mitteilung kann trotzdem schon verschickt sein: Prüfe den Verlauf, bevor du es erneut versuchst.';

	/** Antworten, die beide Anfragen gleich behandeln; `true`, wenn die Antwort erledigt ist. */
	async function behandle(a: Antwort<unknown>): Promise<boolean> {
		if (await leiteUm(a)) return true;
		if (a.art === 'ok') return false;
		if (a.art === 'eingabe') {
			fehler = a.felder;
			await tick();
			const erstes = REIHE.find((f) => fehler[f]);
			formular
				?.querySelector<HTMLElement>(`#mitteilung-${erstes}, [name="mitteilung-${erstes}"]`)
				?.focus();
		} else if (a.art === 'nicht-gefunden') {
			allgemein = 'Diesen Anlass gibt es nicht mehr.';
		} else {
			allgemein = fehlerText(a);
		}
		return true;
	}

	async function zeigeAn(event: SubmitEvent) {
		event.preventDefault();
		if (laeuft) return;
		laeuft = 'vorschau';
		fehler = {};
		allgemein = null;
		const geschickt = werte();
		const a = await zeigeVorschau(bezug, geschickt);
		laeuft = null;
		if (await behandle(a)) return;
		// Wer während der Anfrage weitergetippt hat, braucht eine neue Vorschau.
		if (a.art === 'ok' && gleicheWerte(werte(), geschickt)) {
			vorschau = { werte: geschickt, daten: a.daten };
		}
	}

	async function sende() {
		rueckfrage?.close();
		if (laeuft || !vorschau || !gueltig) return;
		laeuft = 'senden';
		allgemein = null;
		const a = await sendeMitteilung(bezug, vorschau.werte);
		laeuft = null;
		if (a.art === 'stoerung') {
			// Die Antwort fehlt, der Versand kann trotzdem gelaufen sein.
			allgemein = NACH_STOERUNG;
			onverlauf();
			return;
		}
		if (await behandle(a)) return;
		if (a.art !== 'ok') return;
		ergebnis = `Gesendet: ${zahlenText(a.daten)}.`;
		schliesse();
		onverlauf();
	}

	const beschreibung = (...ids: (string | false | undefined)[]) =>
		ids.filter(Boolean).join(' ') || undefined;
</script>

{#if schritt === 'zu'}
	<button type="button" class={knopfHaupt} onclick={neu}>Neue Mitteilung</button>
{:else if schritt === 'vorlage'}
	<section class="karte" aria-labelledby="mitteilung-neu">
		<svelte:element this={`h${stufe}`} id="mitteilung-neu">Neue Mitteilung</svelte:element>
		<p class="leise">Mit einer Vorlage beginnen oder leer anfangen.</p>
		<div class="leiste">
			{#each vorlagen as v (v.art)}
				<button type="button" class="taste-neben" onclick={() => oeffne(v)}
					>{VORLAGE_NAMEN[v.art]}</button
				>
			{/each}
			<button type="button" class="taste-neben" onclick={() => oeffne(null)}>Leer anfangen</button>
			<button type="button" class="taste-neben" onclick={schliesse}>Abbrechen</button>
		</div>
	</section>
{:else}
	<section class="karte" aria-labelledby="mitteilung-neu">
		<svelte:element this={`h${stufe}`} id="mitteilung-neu">Neue Mitteilung</svelte:element>
		<form
			bind:this={formular}
			onsubmit={zeigeAn}
			oninput={() => (vorschau = null)}
			novalidate
			data-ungespeichert={ungespeichert ? '' : undefined}
		>
			<div class="feld-zeile">
				<label for="mitteilung-titel">Titel</label>
				<input
					id="mitteilung-titel"
					type="text"
					maxlength={MAX_TITEL}
					autocomplete="off"
					disabled={laeuft === 'senden'}
					bind:value={titel}
					aria-invalid={fehler.titel ? 'true' : undefined}
					aria-describedby={beschreibung(
						'mitteilung-titel-zaehler',
						!!fehler.titel && 'fehler-mitteilung-titel'
					)}
				/>
				<span class="feld-hilfe" id="mitteilung-titel-zaehler"
					>{titel.length} von {MAX_TITEL} Zeichen</span
				>
				{#if fehler.titel}
					<p class="fehler" id="fehler-mitteilung-titel">{fehler.titel}</p>
				{/if}
			</div>
			<div class="feld-zeile">
				<label for="mitteilung-text">Text</label>
				<textarea
					id="mitteilung-text"
					rows="4"
					maxlength={MAX_TEXT}
					disabled={laeuft === 'senden'}
					bind:value={text}
					aria-invalid={fehler.text ? 'true' : undefined}
					aria-describedby={beschreibung(
						'mitteilung-text-zaehler',
						'mitteilung-text-hinweis',
						!!fehler.text && 'fehler-mitteilung-text'
					)}></textarea>
				<span class="feld-hilfe" id="mitteilung-text-zaehler"
					>{text.length} von {MAX_TEXT} Zeichen</span
				>
				<span class="feld-hilfe" id="mitteilung-text-hinweis"
					>Keine Namen, Telefonnummern oder Resultate: Die Mitteilung kann auf dem Sperrbildschirm
					stehen</span
				>
				{#if fehler.text}
					<p class="fehler" id="fehler-mitteilung-text">{fehler.text}</p>
				{/if}
			</div>
			{#if bezug.art === 'anlass'}
				<fieldset
					class="auswahl-gruppe"
					disabled={laeuft === 'senden'}
					aria-describedby={beschreibung(
						'mitteilung-themen',
						!!fehler.auswahl && 'fehler-mitteilung-auswahl'
					)}
				>
					<legend>Empfänger</legend>
					{#each ANLASS_AUSWAHLEN as a (a)}
						<label class="auswahl">
							<input type="radio" name="mitteilung-auswahl" value={a} bind:group={auswahl} />
							{AUSWAHL_NAMEN[a]}
						</label>
					{/each}
					{#if fehler.auswahl}
						<p class="fehler" id="fehler-mitteilung-auswahl">{fehler.auswahl}</p>
					{/if}
				</fieldset>
			{:else}
				<p><strong>Empfänger:</strong> {AUSWAHL_NAMEN.alle}</p>
			{/if}
			<p class="leise" id="mitteilung-themen">
				Wer diese Mitteilungen im Profil abgeschaltet hat, bekommt sie nicht.
			</p>
			<fieldset
				class="auswahl-gruppe"
				disabled={laeuft === 'senden'}
				aria-describedby={fehler.weg ? 'fehler-mitteilung-weg' : undefined}
			>
				<legend>Weg</legend>
				{#each WEGE as w (w)}
					<label class="auswahl">
						<input type="radio" name="mitteilung-weg" value={w} bind:group={weg} />
						{WEG_NAMEN[w]}
					</label>
				{/each}
				{#if fehler.weg}
					<p class="fehler" id="fehler-mitteilung-weg">{fehler.weg}</p>
				{/if}
			</fieldset>
			<div class="leiste">
				<button type="submit" class="taste-neben" disabled={laeuft !== null}>Vorschau</button>
				<button type="button" class="taste-neben" disabled={laeuft !== null} onclick={schliesse}
					>Abbrechen</button
				>
			</div>
		</form>

		<div role="status">
			{#if gueltig}
				{#each vorschauZeilen(gueltig, weg) as zeile, i (i)}
					<p>
						{#if i === 0}<strong>{zeile}</strong>{:else}{zeile}{/if}
					</p>
				{/each}
			{/if}
		</div>
		{#if gueltig && gueltig.namen.length > 0}
			<details class="karte klappe">
				<summary class="klappe-titel"
					>Namen <span class="leise">{gueltig.namen.length}</span></summary
				>
				<ul>
					{#each gueltig.namen as name, i (i)}
						<li>{name}</li>
					{/each}
				</ul>
			</details>
		{/if}

		<button
			type="button"
			class={knopfHaupt}
			disabled={!senden}
			aria-describedby="mitteilung-senden-hilfe"
			onclick={() => rueckfrage?.showModal()}
			>{laeuft === 'senden' ? 'Wird gesendet …' : 'Senden'}</button
		>
		<span class="feld-hilfe" id="mitteilung-senden-hilfe"
			>{laeuft === 'senden'
				? 'Das kann bis zu einer Minute dauern. Bitte die Seite offen lassen.'
				: gueltig
					? gueltig.anzahl === 0
						? 'Niemand bekommt diese Mitteilung.'
						: ''
					: 'Senden geht nach der Vorschau.'}</span
		>
		{#if allgemein}
			<p class="fehler" role="alert">{allgemein}</p>
		{/if}
	</section>
{/if}

<p class="leise" role="status">{ergebnis ?? ''}</p>

<dialog class="karte" bind:this={rueckfrage} aria-labelledby="mitteilung-rueckfrage-titel">
	<h2 id="mitteilung-rueckfrage-titel">{rueckfrageText(gueltig?.anzahl ?? 0)}</h2>
	<p>«{titel}» geht gleich hinaus. Zurückholen lässt sie sich nicht.</p>
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => rueckfrage?.close()}>Abbrechen</button>
		<button type="button" class="taste-haupt" onclick={sende}>Senden</button>
	</div>
</dialog>
