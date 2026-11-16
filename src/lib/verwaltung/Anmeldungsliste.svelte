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
	import Aktionsdialog from './Aktionsdialog.svelte';
	import Spielersuche from './Spielersuche.svelte';
	import Kontakt from './Kontakt.svelte';
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
		type AnmeldungZeile
	} from './turnier-api.ts';
	import {
		anmeldungStatus,
		anmeldungenText,
		mitgliedVermerk,
		spielerGeschlechtText
	} from './turnier-anzeige.ts';

	type Dialog = ReturnType<typeof Aktionsdialog>;

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
	// K-42: Ab dem 1.1. nach dem Turnierjahr liefert der Server keine Kontaktdaten mehr.
	const mitKontakt = $derived(zeilen?.some((z) => z.email || z.telefon) ?? false);
	// Von Hand anmelden und verschieben gehen erst, wenn das Turnier nicht mehr in Vorbereitung ist.
	const offen = $derived(turnier !== null && !turnier.vorbereitung);

	const GRUND_MAX = 200;
	const WEG = 'Diese Anmeldung gibt es nicht mehr.';
	const VORBEREITUNG = 'Das Turnier ist noch in Vorbereitung.';

	let rueckmeldung = $state<string | null>(null);
	let rueckmeldungFeld = $state<HTMLParagraphElement>();
	let gewaehlt = $state<AnmeldungZeile | null>(null);

	let anmelden = $state<Dialog>();
	let verschieben = $state<Dialog>();
	let klassierungDialog = $state<Dialog>();
	let loeschen = $state<Dialog>();
	let entscheiden = $state<Dialog>();
	let aendern = $state<ReturnType<typeof Zeilenaktionen>>();

	// Jedes Öffnen von «Von Hand anmelden» beginnt mit einer leeren Suche.
	let suchlauf = $state(0);
	let mitgliedId = $state<number | null>(null);
	let zielId = $state<number | null>(null);
	let klassierung = $state<Klassierung | ''>('');
	let grund = $state('');

	function oeffne(dialog: Dialog | undefined, z: AnmeldungZeile | null) {
		gewaehlt = z;
		rueckmeldung = null;
		dialog?.oeffne();
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

	/** Nach einer Aktion (der Dialog ist zu): Liste neu laden, den Satz zeigen, Fokus auf ihn. */
	async function fertig(satz: string) {
		await refreshAll();
		rueckmeldung = satz;
		await tick();
		rueckmeldungFeld?.focus();
	}

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
							<th>Name</th>{#if mitKontakt}<th>Kontakt</th>{/if}<th>Klassierung</th><th
								>Geschlecht</th
							><th>Jahrgang</th><th>Status</th>
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
								{#if mitKontakt}
									<td><Kontakt telefon={z.telefon} email={z.email} /></td>
								{/if}
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

	<Aktionsdialog
		bind:this={anmelden}
		id="anmelden"
		titel="Von Hand anmelden"
		taste="Anmelden"
		trotzdemTaste="Trotzdem anmelden"
		bereit={mitgliedId !== null}
		aktion={(trotzdem) => meldeVonHandAn(kategorieId, mitgliedId as number, trotzdem)}
		erfolg="Angemeldet."
		folgen={{
			'schon-angemeldet': 'Ist schon in dieser Kategorie angemeldet.',
			vorbereitung: VORBEREITUNG,
			'nicht-gefunden': 'Mitglied oder Kategorie ist nicht mehr aktiv.'
		}}
		onfertig={fertig}
	>
		{#key suchlauf}
			<Spielersuche
				id="anmelden"
				label="Mitglied suchen"
				gewaehlt={mitgliedId}
				gesperrt={(id) => (istAngemeldet(id) ? 'schon angemeldet' : null)}
				onwahl={(t) => {
					mitgliedId = t?.mitgliedId ?? null;
					anmelden?.verwerfe();
				}}
			/>
		{/key}
	</Aktionsdialog>

	<Aktionsdialog
		bind:this={verschieben}
		id="verschieben"
		titel="Verschieben"
		taste="Verschieben"
		trotzdemTaste="Trotzdem verschieben"
		bereit={zielId !== null}
		ohneHaupttaste={andere.length === 0}
		aktion={(trotzdem) => verschiebeAnmeldung(gewaehlt!.anmeldungId, zielId as number, trotzdem)}
		erfolg="Verschoben."
		folgen={{
			'schon-angemeldet': 'Ist dort schon angemeldet.',
			vorbereitung: VORBEREITUNG,
			'nicht-gefunden': WEG
		}}
		onfertig={fertig}
	>
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
									verschieben?.verwerfe();
								}}
							/>{k.name}
						</label>
					{/each}
				</fieldset>
			{/if}
		{/if}
	</Aktionsdialog>

	<Aktionsdialog
		bind:this={klassierungDialog}
		id="klassierung"
		titel="Klassierung korrigieren"
		taste="Klassierung speichern"
		bereit={gewaehlt !== null && klassierung !== '' && klassierung !== gewaehlt.klassierung}
		aktion={() => korrigiereKlassierung(gewaehlt!.mitgliedId, klassierung as Klassierung)}
		erfolg="Klassierung gespeichert."
		folgen={{ 'nicht-gefunden': 'Dieses Mitglied gibt es nicht mehr.' }}
		onfertig={fertig}
	>
		{#if gewaehlt}
			<p><Name name={gewaehlt.name} form="nachname-zuerst" /></p>
			<div class="feld">
				<label for="klassierung-wahl">Klassierung</label>
				<select id="klassierung-wahl" bind:value={klassierung}>
					<option value="" disabled>–</option>
					{#each KLASSIERUNGEN as k (k)}
						<option value={k}>{klassierungName(k)}</option>
					{/each}
				</select>
			</div>
		{/if}
	</Aktionsdialog>

	<Aktionsdialog
		bind:this={loeschen}
		id="loeschen"
		titel="Anmeldung löschen?"
		taste="Löschen"
		aktion={() => loescheAnmeldung(gewaehlt!.anmeldungId)}
		erfolg="Gelöscht."
		folgen={{ 'nicht-gefunden': WEG }}
		onfertig={fertig}
	>
		{#if gewaehlt}
			<p><Name name={gewaehlt.name} form="nachname-zuerst" /></p>
		{/if}
	</Aktionsdialog>

	<!-- FR-08: zwei Entscheide; «Ablehnen» steht als zweite Taste vor der Haupttaste «Bestätigen». -->
	<Aktionsdialog
		bind:this={entscheiden}
		id="entscheiden"
		titel="Wildcard-Antrag"
		taste="Bestätigen"
		aktion={() => entscheideAntrag(gewaehlt!.anmeldungId, true, grund)}
		erfolg="Bestätigt."
		neben={{
			taste: 'Ablehnen',
			aktion: () => entscheideAntrag(gewaehlt!.anmeldungId, false, grund),
			erfolg: 'Abgelehnt.'
		}}
		folgen={{ 'nicht-beantragt': 'Darüber ist schon entschieden.', 'nicht-gefunden': WEG }}
		onfertig={fertig}
	>
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
		{/if}
	</Aktionsdialog>
{/if}
