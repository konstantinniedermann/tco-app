import { isIPv4, isIPv6 } from 'node:net';

/** Hängt IPv4-Schreibweise am Ende einer IPv6-Adresse (a.b.c.d) als zwei Gruppen an. */
function ersetzeIpv4Ende(adresse: string): string {
	const letzter = adresse.lastIndexOf(':');
	const ende = adresse.slice(letzter + 1);
	if (!isIPv4(ende)) return adresse;
	const [a, b, c, d] = ende.split('.').map(Number);
	const hoch = ((a << 8) | b).toString(16);
	const tief = ((c << 8) | d).toString(16);
	return `${adresse.slice(0, letzter + 1)}${hoch}:${tief}`;
}

function gruppen(adresse: string): number[] {
	const [vorne, hinten] = adresse.split('::');
	const v = vorne === '' ? [] : vorne.split(':');
	if (hinten === undefined) return v.map((g) => parseInt(g, 16));
	const h = hinten === '' ? [] : hinten.split(':');
	const fehlend = new Array<string>(8 - v.length - h.length).fill('0');
	return [...v, ...fehlend, ...h].map((g) => parseInt(g, 16));
}

/**
 * Schlüssel für die Bremsen pro IP: IPv4 bleibt, IPv4-mapped IPv6 wird zur IPv4,
 * jede andere IPv6 zählt pro /64-Netz. Nicht lesbare Eingaben bleiben unverändert.
 */
export function ipSchluessel(ip: string): string {
	const ohneZone = ip.split('%')[0];
	if (isIPv4(ohneZone)) return ohneZone;
	if (!isIPv6(ohneZone)) return ip;
	const g = gruppen(ersetzeIpv4Ende(ohneZone.toLowerCase()));
	if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
		return [g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff].join('.');
	}
	return `${g
		.slice(0, 4)
		.map((x) => x.toString(16))
		.join(':')}::/64`;
}
