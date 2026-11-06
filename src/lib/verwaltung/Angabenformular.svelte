<script lang="ts" module>
	import type { Angaben, Feld } from './api.ts';

	/** Alle Felder als Text, wie sie in den Eingabefeldern stehen. */
	export type Werte = Record<Feld, string>;

	export const LEERE_WERTE: Werte = {
		mitgliedernummer: '',
		vorname: '',
		nachname: '',
		strasse: '',
		plz: '',
		ort: '',
		email: '',
		telefon: '',
		geschlecht: '',
		jahrgang: '',
		lizenznummer: ''
	};

	export function werteAus(a: Angaben): Werte {
		return {
			mitgliedernummer: a.mitgliedernummer ?? '',
			vorname: a.vorname,
			nachname: a.nachname,
			strasse: a.strasse,
			plz: a.plz,
			ort: a.ort,
			email: a.email,
			telefon: a.telefon ?? '',
			geschlecht: a.geschlecht ?? '',
			jahrgang: a.jahrgang === null ? '' : String(a.jahrgang),
			lizenznummer: a.lizenznummer ?? ''
		};
	}
</script>

<script lang="ts">
	import { FELD_NAMEN, feldMeldung } from './anzeige.ts';

	type Props = {
		start: Werte;
		fehler: Partial<Record<Feld, string>>;
		knopf: string;
		/** Die Taste ist grau, solange nichts geändert ist (Bearbeiten). */
		nurBeiAenderung?: boolean;
		rueckmeldung?: string | null;
		/** Die Rolle darf nur lesen: Felder gesperrt, ohne Tasten (UI-Leitbild, Baustein Nur lesen). */
		nurLesen?: boolean;
		onspeichern: (werte: Werte) => void;
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
	let werte = $state<Werte>({ ...start });
	let formular = $state<HTMLFormElement>();

	const FREIWILLIG: Feld[] = [
		'mitgliedernummer',
		'telefon',
		'geschlecht',
		'jahrgang',
		'lizenznummer'
	];
	const REIHE: Feld[] = [
		'mitgliedernummer',
		'vorname',
		'nachname',
		'strasse',
		'plz',
		'ort',
		'email',
		'telefon',
		'geschlecht',
		'jahrgang',
		'lizenznummer'
	];
	const ART: Partial<Record<Feld, { type?: string; inputmode?: 'numeric' | 'tel' | 'email' }>> = {
		plz: { inputmode: 'numeric' },
		email: { type: 'email', inputmode: 'email' },
		telefon: { type: 'tel', inputmode: 'tel' },
		jahrgang: { inputmode: 'numeric' }
	};

	const geaendert = $derived(REIHE.some((f) => werte[f] !== start[f]));
	const bezeichnung = (f: Feld) =>
		FREIWILLIG.includes(f) ? `${FELD_NAMEN[f]} (freiwillig)` : FELD_NAMEN[f];

	// UI-06: nach einer Rückmeldung des Servers steht der Fokus im ersten Feld mit Fehler.
	$effect(() => {
		const erstes = REIHE.find((f) => fehler[f]);
		if (erstes) formular?.querySelector<HTMLElement>(`#feld-${erstes}`)?.focus();
	});

	function abschicken(event: SubmitEvent) {
		event.preventDefault();
		onspeichern({ ...werte });
	}
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
	{#each REIHE as f (f)}
		<div class="feld-zeile">
			<label for="feld-{f}">{bezeichnung(f)}</label>
			{#if f === 'geschlecht'}
				<select
					id="feld-{f}"
					bind:value={werte[f]}
					aria-invalid={fehler[f] ? 'true' : undefined}
					aria-describedby={fehler[f] ? `fehler-${f}` : undefined}
				>
					<option value="">–</option>
					<option value="w">weiblich</option>
					<option value="m">männlich</option>
				</select>
			{:else}
				<input
					id="feld-{f}"
					bind:value={werte[f]}
					type={ART[f]?.type ?? 'text'}
					inputmode={ART[f]?.inputmode}
					autocomplete="off"
					aria-invalid={fehler[f] ? 'true' : undefined}
					aria-describedby={fehler[f] ? `fehler-${f}` : undefined}
				/>
			{/if}
			{#if fehler[f]}
				<p class="fehler" id="fehler-{f}">{feldMeldung(fehler[f])}</p>
			{/if}
		</div>
	{/each}
{/snippet}
