<!--
	FR-56: Häkchen «Mitglied benachrichtigen» in einem Formular oder einer Rückfrage der Verwaltung,
	als Auswahlfläche über der Haupttaste. Es gilt erst mit der Taste (UI-Leitbild, Auswahlfläche);
	den Standard setzt, wer die Rückfrage öffnet.
-->
<script lang="ts">
	type Props = {
		an: boolean;
		/** Im Doppel «Spieler benachrichtigen». */
		text?: string;
	};

	let { an = $bindable(), text = 'Mitglied benachrichtigen' }: Props = $props();
</script>

<label class="auswahl">
	<input type="checkbox" bind:checked={an} />
	{text}
</label>
