// Kalenderdatei eines Anlasses nach RFC 5545, ohne Personendaten (SI-19).
// Annahme: Ein Anlass kennt kein Ende; im Kalender dauert er zwei Stunden.
export const DAUER_MS = 2 * 60 * 60 * 1000;
const MAX_OKTETTE = 75;

export type KalenderAnlass = {
	kennung: string;
	titel: string;
	beginn: Date;
	ort: string;
	einladung: string;
};

const zeit = (d: Date) =>
	d
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');

function maskiere(text: string): string {
	return text
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r\n|\r|\n/g, '\\n');
}

// Faltet nach 75 Oktetten; ein Zeichen wird nie zerrissen. Fortsetzungen beginnen mit einem
// Leerzeichen, das selbst mitzählt.
function falte(zeile: string): string {
	const kodierer = new TextEncoder();
	const teile: string[] = [];
	let aktuell = '';
	let laenge = 0;
	for (const zeichen of zeile) {
		const n = kodierer.encode(zeichen).length;
		if (laenge + n > MAX_OKTETTE) {
			teile.push(aktuell);
			aktuell = ' ';
			laenge = 1;
		}
		aktuell += zeichen;
		laenge += n;
	}
	teile.push(aktuell);
	return teile.join('\r\n');
}

export function baueKalender(a: KalenderAnlass, jetzt: Date): string {
	const zeilen = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//MyTCO//Anlass//DE',
		'METHOD:PUBLISH',
		'BEGIN:VEVENT',
		`UID:${a.kennung}@mytco`,
		`DTSTAMP:${zeit(jetzt)}`,
		`DTSTART:${zeit(a.beginn)}`,
		`DTEND:${zeit(new Date(a.beginn.getTime() + DAUER_MS))}`,
		`SUMMARY:${maskiere(a.titel)}`,
		`LOCATION:${maskiere(a.ort)}`,
		`DESCRIPTION:${maskiere(a.einladung)}`,
		'END:VEVENT',
		'END:VCALENDAR'
	];
	return zeilen.map(falte).join('\r\n') + '\r\n';
}
