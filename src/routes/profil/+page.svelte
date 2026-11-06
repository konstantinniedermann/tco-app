<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { MELDUNG, meldung, sende } from '../../lib/login/anmelden.ts';
	import { holeSpeicher } from '../../lib/login/mailanfrage.ts';
	import {
		entfernePasskey,
		kannPasskey,
		ladePasskeys,
		richtePasskeyEin,
		type PasskeyAnzeige
	} from '../../lib/login/passkey.ts';
	import {
		MELDUNG_PROFIL,
		fremdMeldung,
		ladeAngaben,
		mitAenderung,
		speichereAngaben,
		type EigeneAngaben,
		type EigenesFeld
	} from '../../lib/profil/angaben.ts';
	import { vergissWechsel } from '../../lib/profil/wechselanfrage.ts';
	import { feldMeldung } from '../../lib/verwaltung/anzeige.ts';
	import { istKlappeOffen, merkeKlappe } from '../../lib/ui/klappe.ts';
	import type { FullAutoFill } from 'svelte/elements';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// «Ansicht als …» ist nur ansehen (UI-Leitbild, Baustein Nur lesen): keine Taste, die speichert.
	const nurAnsehen = $derived(data.ansicht !== null);

	// Meine Angaben (A-KONTO-01, A-KONTO-02, Variante A): jede Angabe als Text mit «Ändern»; «Ändern» öffnet
	// die Felder dieser einen Angabe an Ort und Stelle, nie zwei zugleich (UI-04).
	// Annahme K-19.1: Telefon und Lizenznummer, Annahme K-19.2: Adresse ändert das Mitglied selbst.
	type Angabe = 'telefon' | 'adresse' | 'lizenznummer';
	const FELDER: Record<Angabe, EigenesFeld[]> = {
		telefon: ['telefon'],
		adresse: ['strasse', 'plz', 'ort'],
		lizenznummer: ['lizenznummer']
	};
	const SPEICHERN: Record<Angabe, string> = {
		telefon: 'Telefon speichern',
		adresse: 'Adresse speichern',
		lizenznummer: 'Lizenznummer speichern'
	};
	const BEZEICHNUNG: Record<EigenesFeld, string> = {
		telefon: 'Telefon (freiwillig)',
		strasse: 'Strasse und Nr.',
		plz: 'PLZ',
		ort: 'Ort',
		lizenznummer: 'Lizenznummer (freiwillig)'
	};
	const ART: Partial<Record<EigenesFeld, { type?: string; inputmode?: 'numeric' | 'tel' }>> = {
		telefon: { type: 'tel', inputmode: 'tel' },
		plz: { inputmode: 'numeric' }
	};
	const AUTOCOMPLETE: Record<EigenesFeld, FullAutoFill> = {
		telefon: 'tel',
		strasse: 'street-address',
		plz: 'postal-code',
		ort: 'address-level2',
		lizenznummer: 'off'
	};

	// Stand aus `load`; nach Speichern oder «veraltet» mit dem neu geladenen überschrieben. Lädt
	// `load` neu (neues `data`), gilt wieder dessen Stand.
	let angaben = $derived<EigeneAngaben | null>(data.angaben);
	let offen = $state<Angabe | null>(null);
	let werte = $state<Record<EigenesFeld, string>>({
		telefon: '',
		strasse: '',
		plz: '',
		ort: '',
		lizenznummer: ''
	});
	let feldFehler = $state<Partial<Record<EigenesFeld, string>>>({});
	// Betrifft die ganze Angabe (Störung, Altdaten): unter dem Formular.
	let formularFehler = $state<string | null>(null);
	// «veraltet»: steht nach dem Neuladen unter der Angabe, deren «Ändern» den Fokus bekommt.
	let veraltetBei = $state<Angabe | null>(null);
	let speichert = $state(false);
	let formular = $state<HTMLFormElement>();
	// Ungespeichert (UI-Leitbild): ein Feld der offenen Angabe weicht vom geladenen Stand ab.
	const geaendert = $derived(
		offen !== null &&
			angaben !== null &&
			FELDER[offen].some((f) => werte[f] !== (angaben?.[f] ?? ''))
	);
	const aendernKnoepfe: Partial<Record<Angabe, HTMLButtonElement>> = {};

	// Hinweis nach dem E-Mail-Wechsel, bis «Schliessen».
	let emailHinweis = $state(true);
	let angabenTitel: HTMLElement | undefined;

	const personText = $derived.by(() => {
		if (!angaben) return '';
		const teile = [`${angaben.vorname} ${angaben.nachname}`];
		if (angaben.jahrgang !== null) teile.push(`Jahrgang ${angaben.jahrgang}`);
		if (angaben.mitgliedernummer) teile.push(`Mitgliedernummer ${angaben.mitgliedernummer}`);
		return teile.join(' · ');
	});

	async function oeffne(a: Angabe) {
		if (!angaben) return;
		offen = a;
		feldFehler = {};
		formularFehler = null;
		veraltetBei = null;
		werte = {
			telefon: angaben.telefon ?? '',
			strasse: angaben.strasse,
			plz: angaben.plz,
			ort: angaben.ort,
			lizenznummer: angaben.lizenznummer ?? ''
		};
		await tick();
		formular?.querySelector('input')?.focus();
	}

	async function schliesse() {
		const a = offen;
		offen = null;
		feldFehler = {};
		formularFehler = null;
		await tick();
		if (a) aendernKnoepfe[a]?.focus();
	}

	async function speichern(event: SubmitEvent) {
		event.preventDefault();
		const a = offen;
		if (!a || !angaben || speichert) return;
		speichert = true;
		feldFehler = {};
		formularFehler = null;
		const neu = Object.fromEntries(FELDER[a].map((f) => [f, werte[f]]));
		const r = await speichereAngaben(neu, angaben);
		if (r.ergebnis === 'ok') {
			angaben = (await ladeAngaben()) ?? mitAenderung(angaben, neu);
			await schliesse();
		} else if (r.ergebnis === 'veraltet') {
			const frisch = await ladeAngaben();
			if (frisch) {
				angaben = frisch;
				await schliesse();
				veraltetBei = a;
			} else formularFehler = MELDUNG.stoerung;
		} else if (r.ergebnis === 'eingabe' && !r.fremd && Object.keys(r.felder).length > 0) {
			feldFehler = r.felder;
			await tick();
			const erstes = FELDER[a].find((f) => r.felder[f]);
			if (erstes) formular?.querySelector<HTMLElement>(`#angabe-${erstes}`)?.focus();
		} else if (r.ergebnis === 'eingabe') {
			formularFehler = fremdMeldung(data.kontakt);
		} else formularFehler = MELDUNG.stoerung;
		speichert = false;
	}

	async function hinweisSchliessen() {
		emailHinweis = false;
		// Ohne «?email=geaendert» in der Adresse, damit Neuladen den Hinweis nicht wieder zeigt.
		await goto(resolve('/profil'), { replace: true, shallow: true });
		angabenTitel?.focus();
	}

	// Nach Einrichten oder Entfernen steht hier die neu geladene Liste; bis dahin die aus `load`.
	let neueListe = $state<PasskeyAnzeige[] | null>(null);
	let neuLadenFehlt = $state(false);
	// `null` aus `load` heisst: die Liste liess sich nicht laden (Störung), nicht «keine Passkeys».
	const passkeys = $derived(neueListe ?? data.passkeys);
	const listeGestoert = $derived(neuLadenFehlt || passkeys === null);
	const passkeyMoeglich = kannPasskey();

	let fragtNach = $state<string | null>(null);
	// Fokus-Ziele: Der Fokus darf beim Umschalten der Nachfrage nicht verloren gehen.
	let titel: HTMLElement | undefined;
	let abbrechenKnopf = $state<HTMLButtonElement>();
	let einrichtenKnopf = $state<HTMLButtonElement>();
	const entfernenKnoepfe: Record<string, HTMLButtonElement | undefined> = {};
	let passkeyFehler = $state<string | null>(null);
	let passkeyLaeuft = $state(false);

	let abmeldenLaeuft = $state(false);
	let abmeldenFehler = $state<string | null>(null);

	function datum(d: Date): string {
		return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
	}

	function zuletzt(d: Date | null): string {
		if (!d) return 'noch nie';
		const heute = new Date();
		const tage = Math.round(
			(new Date(heute.getFullYear(), heute.getMonth(), heute.getDate()).getTime() -
				new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
				86_400_000
		);
		if (tage <= 0) return 'heute';
		if (tage === 1) return 'gestern';
		if (tage < 30) return `vor ${tage} Tagen`;
		return datum(d);
	}

	async function neuLaden() {
		const liste = await ladePasskeys();
		if (liste) {
			neueListe = liste;
			neuLadenFehlt = false;
		} else neuLadenFehlt = true;
	}

	async function nachfragen(kennung: string) {
		fragtNach = kennung;
		await tick();
		abbrechenKnopf?.focus();
	}

	async function abbrechen(kennung: string) {
		fragtNach = null;
		await tick();
		entfernenKnoepfe[kennung]?.focus();
	}

	async function einrichten() {
		if (passkeyLaeuft) return;
		passkeyLaeuft = true;
		passkeyFehler = null;
		const r = await richtePasskeyEin();
		if (r === 'ok') await neuLaden();
		else if (r === 'fehler') passkeyFehler = MELDUNG.passkeyEinrichten;
		passkeyLaeuft = false;
	}

	async function entfernen(kennung: string) {
		if (passkeyLaeuft) return;
		passkeyLaeuft = true;
		passkeyFehler = null;
		const r = await entfernePasskey(kennung);
		if (r === 'ok') {
			fragtNach = null;
			await neuLaden();
			await tick();
			(einrichtenKnopf ?? titel)?.focus();
		} else passkeyFehler = MELDUNG.stoerung;
		passkeyLaeuft = false;
	}

	// Ohne Antwort des Servers bleibt die Sitzung gültig: dann Meldung statt Login-Seite.
	async function abmelden() {
		if (abmeldenLaeuft) return;
		abmeldenLaeuft = true;
		abmeldenFehler = null;
		const r = await sende('/api/logout', {});
		abmeldenLaeuft = false;
		if (r.ergebnis === 'ok') {
			// A-KONTO-01: Die gemerkte neue Adresse eines laufenden E-Mail-Wechsels bleibt nicht liegen.
			vergissWechsel(holeSpeicher());
			await goto(resolve('/login'));
		} else abmeldenFehler = meldung(r, MELDUNG.stoerung);
	}
</script>

<svelte:head>
	<title>Profil – MyTCO</title>
</svelte:head>

<h1>Profil</h1>

{#if data.emailGeaendert && emailHinweis && angaben}
	<div class="hinweis" role="status">
		<p><strong>E-Mail geändert.</strong> Ab sofort meldest du dich mit {angaben.email} an.</p>
		<button type="button" class="taste-neben" onclick={hinweisSchliessen}>Schliessen</button>
	</div>
{/if}

<!-- Anfangs zu; offen bleibt, was man offen gelassen hat (UI-Leitbild, Bewegung und Bedienung) -->
<details
	class="karte klappe"
	open={istKlappeOffen('profil-angaben')}
	ontoggle={(e) => merkeKlappe('profil-angaben', e.currentTarget.open)}
>
	<summary class="klappe-titel" bind:this={angabenTitel}>Meine Angaben</summary>
	<div>
		{#if !angaben}
			<p class="fehler" role="alert">{MELDUNG.stoerung}</p>
		{:else}
			<div class="kachel">
				<span>
					<strong>E-Mail</strong><br />{angaben.email}<br />
					<span class="leise">zugleich dein Login</span>
				</span>
				<!-- Annahme K-19.1: Die E-Mail ändert das Mitglied selbst, mit zwei Codes. -->
				{#if !nurAnsehen}
					<a class="taste-neben" href={resolve('/profil/email')}>Ändern</a>
				{/if}
			</div>
			{@render angabe('telefon', 'Telefon', angaben.telefon, false)}
			{@render angabe(
				'adresse',
				'Adresse',
				`${angaben.strasse}, ${angaben.plz} ${angaben.ort}`,
				false
			)}
			{@render angabe('lizenznummer', 'Lizenznummer', angaben.lizenznummer, true)}
			<p class="leise">
				{personText}<br />Name, Jahrgang und Nummer ändert der Admin. Stimmt etwas nicht?
				{#if data.kontakt}Schreib an {data.kontakt}.{:else}Den Kontakt findest du in deinem Brief.{/if}
			</p>
		{/if}
	</div>
</details>

{#snippet angabe(a: Angabe, titelText: string, wert: string | null, freiwillig: boolean)}
	{#if offen === a}
		<form
			bind:this={formular}
			onsubmit={speichern}
			novalidate
			data-ungespeichert={geaendert ? '' : undefined}
		>
			{#if FELDER[a].length > 1}<strong>{titelText}</strong>{/if}
			{#each FELDER[a] as f (f)}
				<div class="feld">
					<label for="angabe-{f}">{BEZEICHNUNG[f]}</label>
					<input
						id="angabe-{f}"
						bind:value={werte[f]}
						type={ART[f]?.type ?? 'text'}
						inputmode={ART[f]?.inputmode}
						autocomplete={AUTOCOMPLETE[f]}
						aria-invalid={feldFehler[f] ? 'true' : undefined}
						aria-describedby={feldFehler[f] ? `angabe-fehler-${f}` : undefined}
					/>
					{#if feldFehler[f]}
						<p class="fehler" id="angabe-fehler-{f}">{feldMeldung(feldFehler[f])}</p>
					{/if}
				</div>
			{/each}
			{#if a === 'adresse'}
				<p class="leise">Der Verein trägt die neue Adresse auch in seiner Mitgliederliste nach.</p>
			{/if}
			<div class="leiste">
				<button type="submit" class="taste-haupt">{SPEICHERN[a]}</button>
				<button type="button" class="taste-neben" onclick={schliesse}>Abbrechen</button>
			</div>
			{#if formularFehler}
				<p class="fehler" role="alert">{formularFehler}</p>
			{/if}
		</form>
	{:else}
		<div class="kachel">
			<span>
				<strong>{titelText}</strong>
				{#if freiwillig}<span class="leise">(freiwillig)</span>{/if}<br />
				{#if wert}{wert}{:else}<span class="leise">nicht erfasst</span>{/if}
			</span>
			{#if !nurAnsehen}
				<button
					type="button"
					class="taste-neben"
					bind:this={aendernKnoepfe[a]}
					onclick={() => oeffne(a)}
					aria-describedby={veraltetBei === a ? 'angaben-veraltet' : undefined}>Ändern</button
				>
			{/if}
		</div>
		{#if veraltetBei === a}
			<p class="fehler" id="angaben-veraltet" role="alert">{MELDUNG_PROFIL.veraltet}</p>
		{/if}
	{/if}
{/snippet}

<details
	class="karte klappe"
	open={istKlappeOffen('profil-passkey')}
	ontoggle={(e) => merkeKlappe('profil-passkey', e.currentTarget.open)}
>
	<summary class="klappe-titel" bind:this={titel}>Anmelden mit Passkey</summary>
	<div>
		{#if listeGestoert}
			<p class="fehler" role="alert">{MELDUNG.stoerung}</p>
		{:else if passkeys}
			{#each passkeys as p (p.kennung)}
				<div class="kachel">
					<span>
						<strong>{p.geraet}</strong><br />
						<span class="leise"
							>eingerichtet am {datum(p.eingerichtetAm)} · zuletzt {zuletzt(p.zuletztBenutzt)}</span
						>
					</span>
					{#if nurAnsehen}
						<!-- Nur ansehen: kein Entfernen -->
					{:else if fragtNach === p.kennung}
						<span role="group" aria-labelledby="nachfrage-{p.kennung}">
							<span id="nachfrage-{p.kennung}">Wirklich entfernen?</span>
							<button type="button" class="taste-neben" onclick={() => entfernen(p.kennung)}
								>Entfernen</button
							>
							<button
								type="button"
								class="taste-neben"
								bind:this={abbrechenKnopf}
								onclick={() => abbrechen(p.kennung)}>Abbrechen</button
							>
						</span>
					{:else}
						<button
							type="button"
							class="taste-neben"
							bind:this={entfernenKnoepfe[p.kennung]}
							onclick={() => nachfragen(p.kennung)}>Entfernen</button
						>
					{/if}
				</div>
			{:else}
				<p>
					Mit einem Passkey meldest du dich ohne Code an: mit Face ID, Fingerabdruck oder der
					Handy-PIN.
				</p>
			{/each}
		{/if}
		{#if passkeyMoeglich && !nurAnsehen}
			<button
				type="button"
				class="taste-neben taste-breit"
				bind:this={einrichtenKnopf}
				onclick={einrichten}
				aria-describedby={passkeyFehler ? 'passkey-fehler' : undefined}
				>Passkey auf diesem Gerät einrichten</button
			>
		{/if}
		{#if passkeyFehler}
			<p class="fehler" id="passkey-fehler" role="alert">{passkeyFehler}</p>
		{/if}
		<p class="leise">
			Gilt für alle Geräte mit demselben Apple- bzw. Google-Konto. Der Code per E-Mail funktioniert
			immer.
		</p>
	</div>
</details>

<div class="karte">
	<button
		type="button"
		class="taste-neben"
		onclick={abmelden}
		aria-describedby={abmeldenFehler ? 'abmelden-fehler' : undefined}>Abmelden</button
	>
	{#if abmeldenFehler}
		<p class="fehler" id="abmelden-fehler" role="alert">{abmeldenFehler}</p>
	{/if}
</div>
