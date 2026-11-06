// Service Worker von MyTCO (FR-40): zeigt Pushes an und öffnet beim Tipp die Seite dazu.
// Bewusst nur `push` und `notificationclick`: kein `fetch`-Handler, kein Cache, kein Vorladen.
// Die App bleibt so immer auf dem Stand des Servers. SvelteKit bündelt und registriert ihn.
import { self } from '$app/service-worker';
import { leseNutzlast, oeffneZiel, sicheresZiel } from '../lib/push/nutzlast.ts';

self.addEventListener('push', (event) => {
	const n = leseNutzlast(event.data);
	if (!n) return;
	event.waitUntil(
		self.registration.showNotification(n.titel, {
			body: n.text,
			data: { link: n.link },
			icon: '/icon-192.png'
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const daten = event.notification.data as { link?: unknown } | null;
	const ziel = sicheresZiel(daten?.link, self.location.origin);
	event.waitUntil(oeffneZiel(self.clients, ziel, self.location.origin));
});
