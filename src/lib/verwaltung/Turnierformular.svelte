<script lang="ts" module>
	import type { TurnierAnsicht, TurnierFeld } from './api.ts';

	/** Felder als Text, wie sie in den Eingabefeldern stehen; Anmeldeschluss `YYYY-MM-DD`. */
	export type TurnierWerte = {
		jahr: string;
		name: string;
		anmeldeschluss: string;
		nummern: { bezeichnung: string; nummer: string }[];
	};

	export const nameFuerJahr = (jahr: string) => `Clubmeisterschaft ${jahr.trim()}`.trim();

	/** Leeres Formular für ein neues Turnier, vorbelegt mit dem nächsten Jahr. */
	export function neuesTurnier(heute: Date): TurnierWerte {
		const jahr = String(heute.getFullYear() + 1);
		return { jahr, name: nameFuerJahr(jahr), anmeldeschluss: '', nummern: [] };
	}

	export function werteAusTurnier(t: TurnierAnsicht): TurnierWerte {
		return {
			jahr: String(t.jahr),
			name: t.name,
			anmeldeschluss: t.anmeldeschluss,
			nummern: t.nummern.map((n) => ({ bezeichnung: n.bezeichnung, nummer: n.nummer }))
		};
	}
</script>

<script lang="ts">
	import { tick, untrack } from 'svelte';

	type Props = {
		start: TurnierWerte;
		fehler: Partial<Record<TurnierFeld, string>>;
		knopf: string;
		/** `taste-haupt` beim Anlegen; auf der Turnierseite `taste-neben`, weil dort «Anmeldung öffnen» die Haupttaste ist. */
		knopfArt?: 'taste-haupt' | 'taste-neben';
		/** Neues Turnier: der Name läuft mit dem Jahr mit, bis er von Hand geändert wird. */
		nameFolgtJahr?: boolean;
		/** Die Taste ist grau, solange nichts geändert ist (Bearbeiten). */
		nurBeiAenderung?: boolean;
		rueckmeldung?: string | null;
		onspeichern: (werte: TurnierWerte) => void;
	};
	let {
		start,
		fehler,
		knopf,
		knopfArt = 'taste-haupt',
		nameFolgtJahr = false,
		nurBeiAenderung = false,
		rueckmeldung = null,
		onspeichern
	}: Props = $props();

	type Zeile = { schluessel: number; bezeichnung: string; nummer: string };
	let naechster = 0;
	const zeile = (n: { bezeichnung: string; nummer: string }): Zeile => ({
		schluessel: naechster++,
		bezeichnung: n.bezeichnung,
		nummer: n.nummer
	});

	// Das Formular wird von aussen neu aufgebaut (`{#key}`), wenn sich `start` ändert.
	// svelte-ignore state_referenced_locally
	let jahr = $state(start.jahr);
	// svelte-ignore state_referenced_locally
	let name = $state(start.name);
	// svelte-ignore state_referenced_locally
	let anmeldeschluss = $state(start.anmeldeschluss);
	// svelte-ignore state_referenced_locally
	let nummern = $state<Zeile[]>(start.nummern.map(zeile));
	let nameVonHand = false;
	let formular = $state<HTMLFormElement>();
	let weitere = $state<HTMLButtonElement>();

	const liste = $derived(nummern.map((n) => ({ bezeichnung: n.bezeichnung, nummer: n.nummer })));
	const geaendert = $derived(
		jahr !== start.jahr ||
			name !== start.name ||
			anmeldeschluss !== start.anmeldeschluss ||
			JSON.stringify(liste) !== JSON.stringify(start.nummern)
	);

	// Welche Zeile der Server beanstandet, sagt er nicht; die Grenzen (FR-33) stehen in
	// `server/turnier/angaben.ts`, das im Browser nicht geladen werden darf.
	const bezeichnungFalsch = (n: Zeile) => !n.bezeichnung.trim() || n.bezeichnung.trim().length > 60;
	const nummerFalsch = (n: Zeile) => !/^\d{1,12}$/.test(n.nummer.trim());

	const REIHE: TurnierFeld[] = ['jahr', 'name', 'anmeldeschluss', 'nummern'];

	// UI-06: nach einer Rückmeldung des Servers steht der Fokus im ersten Feld mit Fehler.
	// Nur `fehler` löst das aus; Tippen in den Feldern darf den Fokus nicht verschieben.
	$effect(() => {
		const erstes = REIHE.find((f) => fehler[f]);
		if (erstes) untrack(() => fokussiere(erstes));
	});

	function fokussiere(feld: TurnierFeld) {
		if (feld !== 'nummern') {
			formular?.querySelector<HTMLElement>(`#turnier-${feld}`)?.focus();
			return;
		}
		const falsch = nummern.find((n) => bezeichnungFalsch(n) || nummerFalsch(n));
		const ziel = falsch
			? `#turnier-${bezeichnungFalsch(falsch) ? 'bezeichnung' : 'nummer'}-${falsch.schluessel}`
			: '#turnier-nummern input';
		(formular?.querySelector<HTMLElement>(ziel) ?? weitere)?.focus();
	}

	function setzeJahr(wert: string) {
		jahr = wert;
		if (nameFolgtJahr && !nameVonHand) name = nameFuerJahr(wert);
	}

	function setzeName(wert: string) {
		name = wert;
		nameVonHand = true;
	}

	async function weitereNummer() {
		const neu = zeile({ bezeichnung: '', nummer: '' });
		nummern.push(neu);
		await tick();
		formular?.querySelector<HTMLElement>(`#turnier-bezeichnung-${neu.schluessel}`)?.focus();
	}

	function entferne(schluessel: number) {
		nummern = nummern.filter((n) => n.schluessel !== schluessel);
		weitere?.focus();
	}

	function abschicken(event: SubmitEvent) {
		event.preventDefault();
		onspeichern({ jahr, name, anmeldeschluss, nummern: liste });
	}

	const beschreibung = (...ids: (string | false | undefined)[]) =>
		ids.filter(Boolean).join(' ') || undefined;
</script>

<form
	bind:this={formular}
	onsubmit={abschicken}
	novalidate
	data-ungespeichert={geaendert ? '' : undefined}
>
	<div class="feld-zeile">
		<label for="turnier-jahr">Jahr</label>
		<input
			id="turnier-jahr"
			type="text"
			inputmode="numeric"
			autocomplete="off"
			maxlength="4"
			bind:value={() => jahr, setzeJahr}
			aria-invalid={fehler.jahr ? 'true' : undefined}
			aria-describedby={fehler.jahr ? 'fehler-turnier-jahr' : undefined}
		/>
		{#if fehler.jahr}
			<p class="fehler" id="fehler-turnier-jahr">{fehler.jahr}</p>
		{/if}
	</div>
	<div class="feld-zeile">
		<label for="turnier-name">Name</label>
		<input
			id="turnier-name"
			type="text"
			maxlength="120"
			autocomplete="off"
			bind:value={() => name, setzeName}
			aria-invalid={fehler.name ? 'true' : undefined}
			aria-describedby={fehler.name ? 'fehler-turnier-name' : undefined}
		/>
		{#if fehler.name}
			<p class="fehler" id="fehler-turnier-name">{fehler.name}</p>
		{/if}
	</div>
	<div class="feld-zeile">
		<label for="turnier-anmeldeschluss">Anmeldeschluss</label>
		<input
			id="turnier-anmeldeschluss"
			type="date"
			bind:value={anmeldeschluss}
			aria-invalid={fehler.anmeldeschluss ? 'true' : undefined}
			aria-describedby={beschreibung(
				'turnier-anmeldeschluss-hilfe',
				!!fehler.anmeldeschluss && 'fehler-turnier-anmeldeschluss'
			)}
		/>
		<span class="feld-hilfe" id="turnier-anmeldeschluss-hilfe"
			>Die Anmeldung schliesst am Ende dieses Tages von selbst.</span
		>
		{#if fehler.anmeldeschluss}
			<p class="fehler" id="fehler-turnier-anmeldeschluss">{fehler.anmeldeschluss}</p>
		{/if}
	</div>
	<fieldset class="auswahl-gruppe" id="turnier-nummern">
		<legend>Turniernummern bei Swiss Tennis (freiwillig)</legend>
		{#each nummern as n, i (n.schluessel)}
			{@const fehlerId = fehler.nummern ? 'fehler-turnier-nummern' : undefined}
			<div class="leiste">
				<div class="feld">
					<label for="turnier-bezeichnung-{n.schluessel}">Bezeichnung</label>
					<input
						id="turnier-bezeichnung-{n.schluessel}"
						type="text"
						maxlength="60"
						autocomplete="off"
						bind:value={n.bezeichnung}
						aria-invalid={fehler.nummern && bezeichnungFalsch(n) ? 'true' : undefined}
						aria-describedby={fehlerId}
					/>
				</div>
				<div class="feld">
					<label for="turnier-nummer-{n.schluessel}">Turniernummer</label>
					<input
						id="turnier-nummer-{n.schluessel}"
						type="text"
						inputmode="numeric"
						maxlength="12"
						autocomplete="off"
						bind:value={n.nummer}
						aria-invalid={fehler.nummern && nummerFalsch(n) ? 'true' : undefined}
						aria-describedby={fehlerId}
					/>
				</div>
				<button
					type="button"
					class="taste-neben"
					aria-label="Entfernen: Turniernummer {i + 1}"
					onclick={() => entferne(n.schluessel)}>Entfernen</button
				>
			</div>
		{/each}
		{#if fehler.nummern}
			<p class="fehler" id="fehler-turnier-nummern">{fehler.nummern}</p>
		{/if}
		<button type="button" class="taste-neben" bind:this={weitere} onclick={weitereNummer}
			>Weitere Turniernummer</button
		>
	</fieldset>
	<button type="submit" class={knopfArt} disabled={nurBeiAenderung && !geaendert}>{knopf}</button>
	<span class="leise" role="status"
		>{#if rueckmeldung && !geaendert}{rueckmeldung}{/if}</span
	>
</form>
