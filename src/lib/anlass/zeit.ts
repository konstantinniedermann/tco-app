// Zeiten von Anlässen: gespeichert als Zeitpunkt (UTC), eingegeben und angezeigt in Schweizer
// Zeit. Läuft im Browser und auf dem Server; die Zeitzone ist fest, nicht die des Geräts.
const ZONE = 'Europe/Zurich';
const STUNDE_MS = 60 * 60 * 1000;
const LOKAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const TEILE = new Intl.DateTimeFormat('de-CH', {
	timeZone: ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});
const NAMEN = new Intl.DateTimeFormat('de-CH', {
	timeZone: ZONE,
	weekday: 'long',
	month: 'long'
});
const KURZ = new Intl.DateTimeFormat('de-CH', { timeZone: ZONE, weekday: 'short' });

type Wanduhr = { jahr: string; monat: string; tag: string; stunde: string; minute: string };

function wanduhr(d: Date): Wanduhr {
	const t = Object.fromEntries(TEILE.formatToParts(d).map((p) => [p.type, p.value]));
	return { jahr: t.year, monat: t.month, tag: t.day, stunde: t.hour, minute: t.minute };
}

/** Zeitpunkt in Schweizer Zeit als Wert für `<input type="datetime-local">`. */
export function utcZuZuerich(d: Date): string {
	const w = wanduhr(d);
	return `${w.jahr}-${w.monat}-${w.tag}T${w.stunde}:${w.minute}`;
}

/**
 * `YYYY-MM-DDTHH:MM` in Schweizer Zeit als Zeitpunkt. Eine Zeit, die es wegen der Umstellung
 * auf Sommerzeit nicht gibt, oder ein ungültiges Datum gibt `null`; die doppelte Stunde im
 * Herbst nimmt die frühere.
 */
export function zuerichZuUtc(lokal: string): Date | null {
	const m = LOKAL.exec(lokal);
	if (!m) return null;
	const [, j, mo, t, h, mi] = m.map(Number);
	const alsUtc = Date.UTC(j, mo - 1, t, h, mi);
	const probe = new Date(alsUtc);
	if (probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== t || h > 23 || mi > 59) return null;
	// Zürich liegt eine (Winter) oder zwei Stunden (Sommer) vor UTC: früheren Kandidaten zuerst.
	for (const versatz of [2, 1]) {
		const kandidat = new Date(alsUtc - versatz * STUNDE_MS);
		if (utcZuZuerich(kandidat) === lokal) return kandidat;
	}
	return null;
}

function namen(d: Date) {
	const t = Object.fromEntries(NAMEN.formatToParts(d).map((p) => [p.type, p.value]));
	return { wochentag: t.weekday, monat: t.month };
}

/** z. B. `Freitag, 19. März 2027, 19.30 Uhr` */
export function formatiereBeginn(iso: string): string {
	const d = new Date(iso);
	const w = wanduhr(d);
	const n = namen(d);
	return `${n.wochentag}, ${Number(w.tag)}. ${n.monat} ${w.jahr}, ${w.stunde}.${w.minute} Uhr`;
}

/** z. B. `Di, 16. März` */
export function formatiereTag(iso: string): string {
	const d = new Date(iso);
	const w = wanduhr(d);
	const wochentag = KURZ.format(d).replace(/\.$/, '');
	return `${wochentag}, ${Number(w.tag)}. ${namen(d).monat}`;
}

/** z. B. `02.03.2027, 14.05` */
export function formatiereZeitpunkt(iso: string): string {
	const w = wanduhr(new Date(iso));
	return `${w.tag}.${w.monat}.${w.jahr}, ${w.stunde}.${w.minute}`;
}
