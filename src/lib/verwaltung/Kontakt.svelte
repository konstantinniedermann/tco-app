<!--
	K-42: Telefon und E-Mail eines Spielers in den Anmeldelisten des CM-Admins, als kurze Links
	«Tel.» und «E-Mail» (UI-Leitbild: Kontakt in den Anmeldelisten); Nummer und Adresse stehen im
	title und im zugänglichen Namen. Ohne Angabe «–».
-->
<script lang="ts">
	import { waehlbar } from '../cm/anzeige.ts';

	let { telefon, email }: { telefon: string | null; email: string | null } = $props();
</script>

<div>
	{#if telefon}<a href="tel:{waehlbar(telefon)}" title={telefon} aria-label="Tel. {telefon}">Tel.</a
		>{/if}{#if telefon && email}&nbsp;·&nbsp;{/if}{#if email}<a
			href="mailto:{email}"
			title={email}
			aria-label="E-Mail {email}">E-Mail</a
		>{/if}{#if !telefon && !email}–{/if}
</div>
