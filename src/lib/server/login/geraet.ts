/** Grobe, freundliche Gerätebezeichnung aus dem User-Agent (nur zur Anzeige). */
export function geraetAusBrowser(userAgent: string | null): string {
	const ua = userAgent ?? '';
	if (/iPhone/.test(ua)) return 'iPhone';
	// iPadOS meldet sich als Mac, aber mit "Mobile"
	if (/iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua))) return 'iPad';
	if (/Android/.test(ua)) return 'Android-Handy';
	if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
	if (/Windows/.test(ua)) return 'Windows-PC';
	return 'Gerät';
}
