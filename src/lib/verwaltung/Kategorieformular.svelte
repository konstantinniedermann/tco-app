<script lang="ts" module>
	import type { KategorieFeld } from './api.ts';
	import type { KategorieAnsicht } from './turnier-api.ts';

	/** Felder als Text, wie sie in den Eingabefeldern stehen; `geschlecht` leer = noch nicht gewählt. */
	export type KategorieWerte = {
		name: string;
		art: 'einzel' | 'doppel';
		geschlecht: '' | 'herren' | 'damen' | 'mixed' | 'offen';
		jahrgangVon: string;
		jahrgangBis: string;
		klassierungVon: string;
		klassierungBis: string;
		mindestsumme: string;
	};

	/** Vorbelegung: Einzel über den ganzen Bereich; beim Doppel die Mindestsumme 9. */
	const VON = 'N1';
	const BIS = 'R9';
	// Annahme K-51: Mindestsumme 9 für alle Doppelkategorien.
	const SUMME = '9';

	export const NEUE_KATEGORIE: KategorieWerte = {
		name: '',
		art: 'einzel',
		geschlecht: '',
		jahrgangVon: '',
		jahrgangBis: '',
		klassierungVon: VON,
		klassierungBis: BIS,
		mindestsumme: SUMME
	};

	export function werteAusKategorie(k: KategorieAnsicht): KategorieWerte {
		const text = (v: number | string | null) => (v === null ? '' : String(v));
		return {
			name: k.name,
			art: k.art,
			geschlecht: k.geschlecht,
			jahrgangVon: text(k.jahrgangVon),
			jahrgangBis: text(k.jahrgangBis),
			klassierungVon: text(k.klassierungVon),
			klassierungBis: text(k.klassierungBis),
			mindestsumme: text(k.mindestsumme)
		};
	}

	/**
	 * Anfrage an den Server: leere Felder als `null`, die Felder der anderen Art ebenfalls. Im
	 * Doppel gibt es keinen Jahrgang (FR-34).
	 */
	export function anfrage(w: KategorieWerte) {
		const zahl = (v: string) => (v.trim() === '' ? null : v.trim());
		const einzel = w.art === 'einzel';
		return {
			name: w.name,
			geschlecht: w.geschlecht,
			art: w.art,
			jahrgangVon: einzel ? zahl(w.jahrgangVon) : null,
			jahrgangBis: einzel ? zahl(w.jahrgangBis) : null,
			klassierungVon: einzel ? w.klassierungVon || null : null,
			klassierungBis: einzel ? w.klassierungBis || null : null,
			mindestsumme: einzel ? null : zahl(w.mindestsumme)
		};
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { BEREICH } from '../turnier/klassierung.ts';

	type Props = {
		start: KategorieWerte;
		fehler: Partial<Record<KategorieFeld, string>>;
		knopf: string;
		/** Die Taste ist grau, solange nichts geändert ist (Bearbeiten). */
		nurBeiAenderung?: boolean;
		rueckmeldung?: string | null;
		/** Die Rolle darf nur lesen: Felder gesperrt, ohne Tasten (UI-Leitbild, Baustein Nur lesen). */
		nurLesen?: boolean;
		onspeichern: (werte: KategorieWerte) => void;
	};
	let {
		start,
		fehler,
		knopf,
		nurBeiAenderung = false,
		rueckmeldung = null,
		nurLesen = false,
		onspeichern
	}: Props = $props();

	// Das Formular wird von aussen neu aufgebaut (`{#key}`), wenn sich `start` ändert.
	// svelte-ignore state_referenced_locally
	let werte = $state<KategorieWerte>({ ...start });
	let formular = $state<HTMLFormElement>();

	const REIHE: KategorieFeld[] = [
		'name',
		'art',
		'geschlecht',
		'jahrgangVon',
		'jahrgangBis',
		'klassierungVon',
		'klassierungBis',
		'mindestsumme'
	];
	const einzel = $derived(werte.art === 'einzel');
	// Verglichen wird, was gespeichert würde: ein Abstecher zu Doppel und zurück ändert nichts.
	const geaendert = $derived(JSON.stringify(anfrage(werte)) !== JSON.stringify(anfrage(start)));

	// UI-06: nach einer Rückmeldung des Servers steht der Fokus im ersten Feld mit Fehler.
	$effect(() => {
		const erstes = REIHE.find((f) => fehler[f]);
		if (erstes)
			untrack(() => formular?.querySelector<HTMLElement>(`#kategorie-${erstes}`)?.focus());
	});

	// FR-34: Mixed gibt es nur im Doppel; beim Doppel ist die Mindestsumme vorbelegt, beim Einzel
	// die Klassierung.
	function waehleArt(art: KategorieWerte['art']) {
		werte.art = art;
		if (art === 'einzel') {
			if (werte.geschlecht === 'mixed') werte.geschlecht = '';
			if (!werte.klassierungVon) werte.klassierungVon = VON;
			if (!werte.klassierungBis) werte.klassierungBis = BIS;
		} else if (!werte.mindestsumme.trim()) {
			werte.mindestsumme = SUMME;
		}
	}

	function abschicken(event: SubmitEvent) {
		event.preventDefault();
		onspeichern({ ...werte });
	}

	const fehlerId = (f: KategorieFeld) => (fehler[f] ? `fehler-kategorie-${f}` : undefined);
	const ungueltig = (f: KategorieFeld) => (fehler[f] ? 'true' : undefined);
</script>

<form
	bind:this={formular}
	onsubmit={abschicken}
	novalidate
	data-ungespeichert={geaendert ? '' : undefined}
>
	{#if nurLesen}
		<fieldset class="nur-lesen" disabled>{@render felder()}</fieldset>
	{:else}
		{@render felder()}
		<button type="submit" class="taste-haupt" disabled={nurBeiAenderung && !geaendert}
			>{knopf}</button
		>
		<span class="leise" role="status"
			>{#if rueckmeldung && !geaendert}{rueckmeldung}{/if}</span
		>
	{/if}
</form>

{#snippet felder()}
	<div class="feld-zeile">
		<label for="kategorie-name">Name</label>
		<input
			id="kategorie-name"
			type="text"
			maxlength="60"
			autocomplete="off"
			bind:value={werte.name}
			aria-invalid={ungueltig('name')}
			aria-describedby={fehlerId('name')}
		/>
		{#if fehler.name}
			<p class="fehler" id="fehler-kategorie-name">{fehler.name}</p>
		{/if}
	</div>

	<fieldset class="auswahl-gruppe" aria-describedby={fehlerId('art')}>
		<legend>Art</legend>
		<label class="auswahl"
			><input
				id="kategorie-art"
				type="radio"
				name="kategorie-art"
				value="einzel"
				checked={werte.art === 'einzel'}
				onchange={() => waehleArt('einzel')}
			/>Einzel</label
		>
		<label class="auswahl"
			><input
				type="radio"
				name="kategorie-art"
				value="doppel"
				checked={werte.art === 'doppel'}
				onchange={() => waehleArt('doppel')}
			/>Doppel</label
		>
		{#if fehler.art}
			<p class="fehler" id="fehler-kategorie-art">{fehler.art}</p>
		{/if}
	</fieldset>

	<fieldset
		class="auswahl-gruppe"
		aria-describedby={[einzel && 'kategorie-mixed-hinweis', fehlerId('geschlecht')]
			.filter(Boolean)
			.join(' ') || undefined}
	>
		<legend>Geschlecht</legend>
		<label class="auswahl"
			><input
				id="kategorie-geschlecht"
				type="radio"
				name="kategorie-geschlecht"
				value="herren"
				bind:group={werte.geschlecht}
			/>Herren</label
		>
		<label class="auswahl"
			><input
				type="radio"
				name="kategorie-geschlecht"
				value="damen"
				bind:group={werte.geschlecht}
			/>Damen</label
		>
		{#if !einzel}
			<label class="auswahl"
				><input
					type="radio"
					name="kategorie-geschlecht"
					value="mixed"
					bind:group={werte.geschlecht}
				/>Mixed (eine Frau und ein Mann)</label
			>
		{/if}
		<label class="auswahl"
			><input
				type="radio"
				name="kategorie-geschlecht"
				value="offen"
				bind:group={werte.geschlecht}
			/>offen (alle)</label
		>
		{#if einzel}
			<p class="leise" id="kategorie-mixed-hinweis">Mixed gibt es nur im Doppel.</p>
		{/if}
		{#if fehler.geschlecht}
			<p class="fehler" id="fehler-kategorie-geschlecht">{fehler.geschlecht}</p>
		{/if}
	</fieldset>

	<!-- FR-34: Jahrgang und Klassierungsbereich nur im Einzel, die Mindestsumme nur im Doppel. -->
	{#if einzel}
		<fieldset class="auswahl-gruppe">
			<legend>Jahrgang (freiwillig)</legend>
			<div class="leiste">
				<div class="feld">
					<label for="kategorie-jahrgangVon">von</label>
					<input
						id="kategorie-jahrgangVon"
						type="text"
						inputmode="numeric"
						maxlength="4"
						autocomplete="off"
						bind:value={werte.jahrgangVon}
						aria-invalid={ungueltig('jahrgangVon')}
						aria-describedby={fehlerId('jahrgangVon')}
					/>
					{#if fehler.jahrgangVon}
						<p class="fehler" id="fehler-kategorie-jahrgangVon">{fehler.jahrgangVon}</p>
					{/if}
				</div>
				<div class="feld">
					<label for="kategorie-jahrgangBis">bis</label>
					<input
						id="kategorie-jahrgangBis"
						type="text"
						inputmode="numeric"
						maxlength="4"
						autocomplete="off"
						bind:value={werte.jahrgangBis}
						aria-invalid={ungueltig('jahrgangBis')}
						aria-describedby={fehlerId('jahrgangBis')}
					/>
					{#if fehler.jahrgangBis}
						<p class="fehler" id="fehler-kategorie-jahrgangBis">{fehler.jahrgangBis}</p>
					{/if}
				</div>
			</div>
			<p class="leise">
				Leer lassen, wenn es keine Grenze gibt. Beispiel Junioren U18 im Jahr 2027: von 2009, bis
				leer.
			</p>
		</fieldset>

		<fieldset class="auswahl-gruppe">
			<legend>Klassierung</legend>
			<div class="leiste">
				<div class="feld">
					<label for="kategorie-klassierungVon">von (stärkste)</label>
					<select
						id="kategorie-klassierungVon"
						bind:value={werte.klassierungVon}
						aria-invalid={ungueltig('klassierungVon')}
						aria-describedby={fehlerId('klassierungVon')}
					>
						{#each BEREICH as s (s)}
							<option value={s}>{s}</option>
						{/each}
					</select>
					{#if fehler.klassierungVon}
						<p class="fehler" id="fehler-kategorie-klassierungVon">{fehler.klassierungVon}</p>
					{/if}
				</div>
				<div class="feld">
					<label for="kategorie-klassierungBis">bis (schwächste)</label>
					<select
						id="kategorie-klassierungBis"
						bind:value={werte.klassierungBis}
						aria-invalid={ungueltig('klassierungBis')}
						aria-describedby={fehlerId('klassierungBis')}
					>
						{#each BEREICH as s (s)}
							<option value={s}>{s}</option>
						{/each}
					</select>
					{#if fehler.klassierungBis}
						<p class="fehler" id="fehler-kategorie-klassierungBis">{fehler.klassierungBis}</p>
					{/if}
				</div>
			</div>
			<p class="leise">Reicht der Bereich bis R9, dürfen auch Spieler ohne Lizenz mitspielen.</p>
		</fieldset>
	{:else}
		<div class="feld-zeile">
			<label for="kategorie-mindestsumme">Mindestsumme der Klassierungen</label>
			<input
				id="kategorie-mindestsumme"
				type="text"
				inputmode="numeric"
				maxlength="2"
				autocomplete="off"
				bind:value={werte.mindestsumme}
				aria-invalid={ungueltig('mindestsumme')}
				aria-describedby={[
					'kategorie-mindestsumme-hilfe',
					fehler.mindestsumme && 'fehler-kategorie-mindestsumme'
				]
					.filter(Boolean)
					.join(' ')}
			/>
			<span class="feld-hilfe" id="kategorie-mindestsumme-hilfe"
				>Die Klassierungen beider Spieler zusammengezählt: R1 = 1 bis R9 = 9, keine Lizenz = 10, N =
				0. Bei 9 geht R4 + R5, R3 + R5 nicht.</span
			>
			{#if fehler.mindestsumme}
				<p class="fehler" id="fehler-kategorie-mindestsumme">{fehler.mindestsumme}</p>
			{/if}
		</div>
	{/if}
{/snippet}
