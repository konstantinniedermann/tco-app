<!--
	A-ANMELDUNG-06, FR-08, FR-46: Einzel-Anmeldungen einer Kategorie in der Verwaltung. Der CM-Admin
	meldet von Hand an, verschiebt, löscht, korrigiert die Klassierung und entscheidet über
	Wildcard-Anträge; wer nur liest, sieht dieselbe Liste ohne Tasten. Nach jeder Aktion lädt die
	Seite neu (Liste und Kopf der Kategorie, deren Absage von der Zahl abhängt).
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { refreshAll } from '$app/navigation';
	import Name from '../ui/Name.svelte';
	import { amtlicherName } from '../name.ts';
	import Spielersuche from './Spielersuche.svelte';
	import Zeilenaktionen from './Zeilenaktionen.svelte';
	import Zeilentasten from './Zeilentasten.svelte';
	import type { Zeilenaktion } from './zeilenaktionen.ts';
	import { KLASSIERUNGEN, klassierungName, type Klassierung } from '../turnier/klassierung.ts';
	import {
		entscheideAntrag,
		korrigiereKlassierung,
		loescheAnmeldung,
		meldeVonHandAn,
		verschiebeAnmeldung,
		type Antwort,
		type AnmeldungZeile,
		type Warnung
	} from './api.ts';
	import { fehlerText } from './anzeige.ts';
	import {
		anmeldungStatus,
		anmeldungenText,
		mitgliedVermerk,
		spielerGeschlechtText,
		warnungText
	} from './turnier-anzeige.ts';
	import { leiteUm } from './umleiten.ts';

	type Props = {
		kategorieId: number;
		/** `null`: Die Liste liess sich nicht laden. */
		zeilen: AnmeldungZeile[] | null;
		/**
		 * Aus dem Turnier: die übrigen aktiven Einzel-Kategorien (Ziel fürs Verschieben) und ob es
		 * noch in Vorbereitung ist. `null`: Das Turnier liess sich nicht laden; dann fehlen
		 * Von Hand anmelden und Verschieben, statt einen falschen Stand zu zeigen.
		 */
		turnier: { andere: { id: number; name: string }[]; vorbereitung: boolean } | null;
		nurLesen: boolean;
	};

	let { kategorieId, zeilen, turnier, nurLesen }: Props = $props();

	const andere = $derived(turnier?.andere ?? []);
	// Von Hand anmelden und verschieben gehen erst, wenn das Turnier nicht mehr in Vorbereitung ist.
	const offen = $derived(turnier !== null && !turnier.vorbereitung);

	const GRUND_MAX = 200;
	const WEG = 'Diese Anmeldung gibt es nicht mehr.';
	const VORBEREITUNG = 'Das Turnier ist noch in Vorbereitung.';

	let rueckmeldung = $state<string | null>(null);
	let rueckmeldungFeld = $state<HTMLParagraphElement>();
	let laeuft = $state(false);
	let fehler = $state<string | null>(null);
	// Nach `409 warnung` zeigt derselbe Dialog die Warnungen; die Haupttaste heisst dann «Trotzdem …».
	let warnungen = $state<Warnung[]>([]);
	let gewaehlt = $state<AnmeldungZeile | null>(null);

	let anmelden = $state<HTMLDialogElement>();
	let verschieben = $state<HTMLDialogElement>();
	let klassierungDialog = $state<HTMLDialogElement>();
	let loeschen = $state<HTMLDialogElement>();
	let entscheiden = $state<HTMLDialogElement>();
	let aendern = $state<ReturnType<typeof Zeilenaktionen>>();

	// Jedes Öffnen von «Von Hand anmelden» beginnt mit einer leeren Suche.
	let suchlauf = $state(0);
	let mitgliedId = $state<number | null>(null);
	let zielId = $state<number | null>(null);
	let klassierung = $state<Klassierung | ''>('');
	let grund = $state('');

	function oeffne(dialog: HTMLDialogElement | undefined, z: AnmeldungZeile | null) {
		gewaehlt = z;
		fehler = null;
		warnungen = [];
		rueckmeldung = null;
		dialog?.showModal();
	}

	function oeffneAnmelden() {
		suchlauf++;
		mitgliedId = null;
		oeffne(anmelden, null);
	}

	function oeffneVerschieben(z: AnmeldungZeile) {
		zielId = null;
		oeffne(verschieben, z);
	}

	function oeffneKlassierung(z: AnmeldungZeile) {
		klassierung = z.klassierung ?? '';
		oeffne(klassierungDialog, z);
	}

	function oeffneEntscheid(z: AnmeldungZeile) {
		grund = '';
		oeffne(entscheiden, z);
	}

	/** Was in der Zeile gerade geht; ab drei Aktionen stehen sie im Dialog «Ändern». */
	function aktionenVon(z: AnmeldungZeile): Zeilenaktion[] {
		return [
			...(z.status === 'beantragt' ? [{ name: 'Entscheiden', los: () => oeffneEntscheid(z) }] : []),
			...(offen ? [{ name: 'Verschieben', los: () => oeffneVerschieben(z) }] : []),
			{ name: 'Klassierung', los: () => oeffneKlassierung(z) },
			{ name: 'Löschen', los: () => oeffne(loeschen, z) }
		];
	}

	/**
	 * Führt eine Aktion aus. Bei Erfolg und bei den Antworten in `folgen` (der Stand hat sich
	 * inzwischen geändert) schliesst der Dialog, die Seite lädt neu und sagt es in einem Satz.
	 */
	async function fuehreAus(
		dialog: HTMLDialogElement | undefined,
		aufruf: () => Promise<Antwort<unknown>>,
		erfolg: string,
		folgen: Partial<Record<Antwort<unknown>['art'], string>>
	) {
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		const a = await aufruf();
		if (await leiteUm(a)) {
			laeuft = false;
			dialog?.close();
			return;
		}
		const satz = a.art === 'ok' ? erfolg : a.art === 'warnung' ? undefined : folgen[a.art];
		// Wurde der Dialog inzwischen geschlossen, gehören Warnungen und Fehler zu keinem Dialog mehr
		// (`warnungen` und `fehler` teilen sich alle Dialoge). Ein geänderter Stand lädt trotzdem neu.
		if (!dialog?.open) {
			if (satz !== undefined) {
				await refreshAll();
				rueckmeldung = satz;
			}
			laeuft = false;
			return;
		}
		if (a.art === 'warnung') {
			warnungen = a.warnungen;
			laeuft = false;
			return;
		}
		if (satz === undefined) {
			fehler = fehlerText(a);
			laeuft = false;
			return;
		}
		dialog.close();
		await refreshAll();
		laeuft = false;
		rueckmeldung = satz;
		await tick();
		rueckmeldungFeld?.focus();
	}

	const meldeAn = () =>
		mitgliedId !== null &&
		fuehreAus(
			anmelden,
			() => meldeVonHandAn(kategorieId, mitgliedId as number, warnungen.length > 0),
			'Angemeldet.',
			{
				'schon-angemeldet': 'Ist schon in dieser Kategorie angemeldet.',
				vorbereitung: VORBEREITUNG,
				'nicht-gefunden': 'Mitglied oder Kategorie ist nicht mehr aktiv.'
			}
		);

	const verschiebe = (z: AnmeldungZeile) =>
		zielId !== null &&
		fuehreAus(
			verschieben,
			() => verschiebeAnmeldung(z.anmeldungId, zielId as number, warnungen.length > 0),
			'Verschoben.',
			{
				'schon-angemeldet': 'Ist dort schon angemeldet.',
				vorbereitung: VORBEREITUNG,
				'nicht-gefunden': WEG
			}
		);

	const speichereKlassierung = (z: AnmeldungZeile, k: Klassierung) =>
		fuehreAus(
			klassierungDialog,
			() => korrigiereKlassierung(z.mitgliedId, k),
			'Klassierung gespeichert.',
			{ 'nicht-gefunden': 'Dieses Mitglied gibt es nicht mehr.' }
		);

	const loesche = (z: AnmeldungZeile) =>
		fuehreAus(loeschen, () => loescheAnmeldung(z.anmeldungId), 'Gelöscht.', {
			'nicht-gefunden': WEG
		});

	const entscheide = (z: AnmeldungZeile, bestaetigt: boolean) =>
		fuehreAus(
			entscheiden,
			() => entscheideAntrag(z.anmeldungId, bestaetigt, grund),
			bestaetigt ? 'Bestätigt.' : 'Abgelehnt.',
			{ 'nicht-beantragt': 'Darüber ist schon entschieden.', 'nicht-gefunden': WEG }
		);

	const istAngemeldet = (id: number) => (zeilen ?? []).some((z) => z.mitgliedId === id);
</script>

<h2>Anmeldungen</h2>
<div class="karte">
	{#if zeilen === null}
		<p class="fehler" role="alert">Die Anmeldungen lassen sich gerade nicht laden.</p>
		<button type="button" class="taste-neben" onclick={() => refreshAll()}>Neu laden</button>
	{:else}
		<p>{anmeldungenText(zeilen)}</p>
		{#if !nurLesen}
			{#if turnier === null}
				<p class="fehler" role="alert">
					Das Turnier lässt sich gerade nicht laden. Von Hand anmelden und verschieben gehen erst
					danach.
				</p>
				<div class="leiste">
					<button type="button" class="taste-neben" onclick={() => refreshAll()}>Neu laden</button>
				</div>
			{:else if turnier.vorbereitung}
				<p class="leise">
					Von Hand anmelden und verschieben gehen, sobald die Anmeldung offen ist.
				</p>
			{:else}
				<div class="leiste">
					<button type="button" class="taste-neben" onclick={oeffneAnmelden}
						>Von Hand anmelden</button
					>
				</div>
			{/if}
		{/if}
		<p class="leise" role="status" tabindex="-1" bind:this={rueckmeldungFeld}>
			{#if rueckmeldung}{rueckmeldung}{/if}
		</p>
		{#if zeilen.length > 0}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div
				class="tabelle"
				role={nurLesen ? 'region' : undefined}
				aria-label={nurLesen ? 'Anmeldungen' : undefined}
				tabindex={nurLesen ? 0 : undefined}
			>
				<table>
					<thead>
						<tr>
							<th>Name</th><th>Klassierung</th><th>Geschlecht</th><th>Jahrgang</th><th>Status</th>
							{#if !nurLesen}<th>Aktionen</th>{/if}
						</tr>
					</thead>
					<tbody>
						{#each zeilen as z (z.anmeldungId)}
							{@const status = anmeldungStatus(z.status)}
							{@const vermerk = mitgliedVermerk(z.mitgliedStatus)}
							{@const aktionen = aktionenVon(z)}
							<tr>
								<td>
									<div class="zelle-dehnbar">
										<span
											id="anmeldung-{z.anmeldungId}"
											class="zelle-kurz"
											title={amtlicherName(z.name, 'nachname-zuerst')}
											><Name name={z.name} form="nachname-zuerst" /></span
										>
										{#if vermerk}<span class={vermerk.klasse}>{vermerk.text}</span>{/if}
										{#if z.kommentar}
											<span class="leise zelle-kurz" title={z.kommentar}>{z.kommentar}</span>
										{/if}
									</div>
								</td>
								<td>
									{#if z.klassierung}
										{klassierungName(z.klassierung)}
									{:else}
										<span class="plakette plakette-offen">fehlt</span>
									{/if}
								</td>
								<td>{spielerGeschlechtText(z.geschlecht)}</td>
								<td>{z.jahrgang ?? '–'}</td>
								<td><span class="plakette {status.klasse}">{status.text}</span></td>
								{#if !nurLesen}
									<td>
										<Zeilentasten
											{aktionen}
											beschrieben="anmeldung-{z.anmeldungId}"
											onaendern={() =>
												aendern?.zeige({ name: z.name, text: z.kommentar, aktionen })}
										/>
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>

{#if !nurLesen}
	<Zeilenaktionen bind:this={aendern} id="anmeldung-aendern" />

	<dialog class="karte" bind:this={anmelden} aria-labelledby="anmelden-titel">
		<h2 id="anmelden-titel">Von Hand anmelden</h2>
		{#key suchlauf}
			<Spielersuche
				id="anmelden"
				label="Mitglied suchen"
				gewaehlt={mitgliedId}
				gesperrt={(id) => (istAngemeldet(id) ? 'schon angemeldet' : null)}
				onwahl={(t) => {
					mitgliedId = t?.mitgliedId ?? null;
					warnungen = [];
					fehler = null;
				}}
			/>
		{/key}
		{#if warnungen.length > 0}
			<p role="alert">{warnungText(warnungen)}</p>
		{/if}
		{#if fehler}
			<p class="fehler" role="alert">{fehler}</p>
		{/if}
		<div class="leiste">
			<button type="button" class="taste-neben" onclick={() => anmelden?.close()}>Abbrechen</button>
			<button
				type="button"
				class="taste-haupt"
				disabled={mitgliedId === null || laeuft}
				onclick={meldeAn}>{warnungen.length > 0 ? 'Trotzdem anmelden' : 'Anmelden'}</button
			>
		</div>
	</dialog>

	<dialog class="karte" bind:this={verschieben} aria-labelledby="verschieben-titel">
		<h2 id="verschieben-titel">Verschieben</h2>
		{#if gewaehlt}
			{@const z = gewaehlt}
			<p><Name name={z.name} form="nachname-zuerst" /></p>
			{#if z.status === 'beantragt'}
				<p>Der Antrag gilt danach als bestätigt.</p>
			{/if}
			{#if andere.length === 0}
				<p>Es gibt keine andere aktive Einzel-Kategorie.</p>
			{:else}
				<fieldset class="auswahl-gruppe">
					<legend>Nach</legend>
					{#each andere as k (k.id)}
						<label class="auswahl">
							<input
								type="radio"
								name="verschieben-ziel"
								value={k.id}
								checked={zielId === k.id}
								onchange={() => {
									zielId = k.id;
									warnungen = [];
								}}
							/>{k.name}
						</label>
					{/each}
				</fieldset>
			{/if}
			{#if warnungen.length > 0}
				<p role="alert">{warnungText(warnungen)}</p>
			{/if}
			{#if fehler}
				<p class="fehler" role="alert">{fehler}</p>
			{/if}
			<div class="leiste">
				<button type="button" class="taste-neben" onclick={() => verschieben?.close()}
					>Abbrechen</button
				>
				{#if andere.length > 0}
					<button
						type="button"
						class="taste-haupt"
						disabled={zielId === null || laeuft}
						onclick={() => verschiebe(z)}
						>{warnungen.length > 0 ? 'Trotzdem verschieben' : 'Verschieben'}</button
					>
				{/if}
			</div>
		{/if}
	</dialog>

	<dialog class="karte" bind:this={klassierungDialog} aria-labelledby="klassierung-titel">
		<h2 id="klassierung-titel">Klassierung korrigieren</h2>
		{#if gewaehlt}
			{@const z = gewaehlt}
			<p><Name name={z.name} form="nachname-zuerst" /></p>
			<div class="feld">
				<label for="klassierung-wahl">Klassierung</label>
				<select id="klassierung-wahl" bind:value={klassierung}>
					<option value="" disabled>–</option>
					{#each KLASSIERUNGEN as k (k)}
						<option value={k}>{klassierungName(k)}</option>
					{/each}
				</select>
			</div>
			{#if fehler}
				<p class="fehler" role="alert">{fehler}</p>
			{/if}
			<div class="leiste">
				<button type="button" class="taste-neben" onclick={() => klassierungDialog?.close()}
					>Abbrechen</button
				>
				<button
					type="button"
					class="taste-haupt"
					disabled={klassierung === '' || klassierung === z.klassierung || laeuft}
					onclick={() => klassierung !== '' && speichereKlassierung(z, klassierung)}
					>Klassierung speichern</button
				>
			</div>
		{/if}
	</dialog>

	<dialog class="karte" bind:this={loeschen} aria-labelledby="loeschen-titel">
		<h2 id="loeschen-titel">Anmeldung löschen?</h2>
		{#if gewaehlt}
			{@const z = gewaehlt}
			<p><Name name={z.name} form="nachname-zuerst" /></p>
			{#if fehler}
				<p class="fehler" role="alert">{fehler}</p>
			{/if}
			<div class="leiste">
				<button type="button" class="taste-neben" onclick={() => loeschen?.close()}
					>Abbrechen</button
				>
				<button type="button" class="taste-haupt" disabled={laeuft} onclick={() => loesche(z)}
					>Löschen</button
				>
			</div>
		{/if}
	</dialog>

	<dialog class="karte" bind:this={entscheiden} aria-labelledby="entscheiden-titel">
		<h2 id="entscheiden-titel">Wildcard-Antrag</h2>
		{#if gewaehlt}
			{@const z = gewaehlt}
			<p><Name name={z.name} form="nachname-zuerst" /></p>
			{#if z.kommentar}
				<p class="mehrzeilig">{z.kommentar}</p>
			{/if}
			<div class="feld">
				<label for="entscheiden-grund">Grund (freiwillig)</label>
				<input
					id="entscheiden-grund"
					type="text"
					maxlength={GRUND_MAX}
					autocomplete="off"
					aria-describedby="entscheiden-grund-hilfe entscheiden-grund-zaehler"
					bind:value={grund}
				/>
				<span class="feld-hilfe" id="entscheiden-grund-hilfe"
					>Nur bei Ablehnung. Steht in der Meldung an den Spieler; bitte keine Angaben zur
					Gesundheit.</span
				>
				<span class="feld-hilfe" id="entscheiden-grund-zaehler"
					>{grund.length} von {GRUND_MAX} Zeichen</span
				>
			</div>
			{#if fehler}
				<p class="fehler" role="alert">{fehler}</p>
			{/if}
			<div class="leiste">
				<button type="button" class="taste-neben" onclick={() => entscheiden?.close()}
					>Abbrechen</button
				>
				<button
					type="button"
					class="taste-neben"
					disabled={laeuft}
					onclick={() => entscheide(z, false)}>Ablehnen</button
				>
				<button
					type="button"
					class="taste-haupt"
					disabled={laeuft}
					onclick={() => entscheide(z, true)}>Bestätigen</button
				>
			</div>
		{/if}
	</dialog>
{/if}
