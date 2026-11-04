<script lang="ts">
	import { asset } from '$app/paths';

	// Bilder der Anleitung iPhone (Safari, iOS 26). Beschriftungen nur, wo die Hilfe von Apple sie
	// belegt; sonst graue Balken (`.anleitung-eintrag.leer`). `aktiv` = sichtbares Bild, -1 = alle.
	let { aktiv }: { aktiv: number } = $props();
	const symbol = asset('favicon.svg');
</script>

<div class="anleitung-film" aria-hidden="true">
	<div class={['anleitung-bild', { aktiv: aktiv === 0 }]}>
		<div class="anleitung-kopf">MyTCO</div>
		<div class="anleitung-zeile"></div>
		<div class="anleitung-zeile kurz"></div>
		<div class="anleitung-zeile"></div>
		<div class="anleitung-leiste unten">
			<span class="anleitung-knopf">‹</span><span class="anleitung-adresse">my.tcolten.ch</span
			><span class="anleitung-knopf">•••</span>
		</div>
		<i class="anleitung-tipp anleitung-tipp-ios-1"></i>
	</div>
	<div class={['anleitung-bild', { aktiv: aktiv === 1 }]}>
		<div class="anleitung-kopf">MyTCO</div>
		<div class="anleitung-zeile"></div>
		<div class="anleitung-zeile kurz"></div>
		<div class="anleitung-menue unten anleitung-rein-unten">
			<div class="anleitung-eintrag leer"></div>
			<div class="anleitung-eintrag leer"></div>
			<div class="anleitung-eintrag">
				Teilen<svg class="symbol" viewBox="0 0 24 24"
					><path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path
						d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2"
					/></svg
				>
			</div>
		</div>
		<div class="anleitung-leiste unten">
			<span class="anleitung-knopf">‹</span><span class="anleitung-adresse">my.tcolten.ch</span
			><span class="anleitung-knopf">•••</span>
		</div>
		<i class="anleitung-tipp anleitung-tipp-ios-2"></i>
	</div>
	<div class={['anleitung-bild', { aktiv: aktiv === 2 }]}>
		<div class="anleitung-kopf">MyTCO</div>
		<div class="anleitung-blatt anleitung-rein-blatt">
			<div class="anleitung-eintrag anleitung-blatt-titel">my.tcolten.ch</div>
			<div class="anleitung-scrollt">
				<div class="anleitung-eintrag leer"></div>
				<div class="anleitung-eintrag leer"></div>
				<div class="anleitung-eintrag leer"></div>
				<div class="anleitung-eintrag">Zu Home-Bildschirm hinzufügen</div>
				<div class="anleitung-eintrag leer"></div>
			</div>
		</div>
		<i class="anleitung-tipp anleitung-tipp-ios-3"></i>
	</div>
	<div class={['anleitung-bild', { aktiv: aktiv === 3 }]}>
		<div class="anleitung-dialog anleitung-rein-dialog">
			<div class="anleitung-dialog-kopf">
				<span class="anleitung-rund"></span><span>Hinzufügen</span>
			</div>
			<div class="anleitung-app">
				<img class="anleitung-symbol-app" src={symbol} alt="" /><strong>MyTCO</strong>
			</div>
			<div class="anleitung-schalter"><span>Als Web-App öffnen</span><i></i></div>
		</div>
		<i class="anleitung-tipp anleitung-tipp-ios-4"></i>
	</div>
	<div class={['anleitung-bild', { aktiv: aktiv === 4 }]}>
		<div class="anleitung-home">
			<span></span>
			<figure class="anleitung-rein-symbol"><img src={symbol} alt="" />MyTCO</figure>
			<span></span><span></span><span></span><span></span><span></span><span></span>
			<span class="anleitung-erledigt">✓ Fertig</span>
		</div>
		<i class="anleitung-tipp anleitung-tipp-home"></i>
	</div>
</div>
