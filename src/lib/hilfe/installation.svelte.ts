// Install-Angebot von Chrome auf Android (A-HILFE-02). Chrome meldet es früh mit dem Ereignis
// `beforeinstallprompt`; MyTCO hält es zurück und zeigt stattdessen die Taste «MyTCO installieren».
// Der Dialog lässt sich pro Angebot nur einmal öffnen.

type Angebot = Event & {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export const installation = $state({ angebot: false, installiert: false });

let gemerkt: Angebot | null = null;

export function beobachteInstallation(fenster: Window): void {
	fenster.addEventListener('beforeinstallprompt', (ereignis) => {
		ereignis.preventDefault();
		gemerkt = ereignis as Angebot;
		installation.angebot = true;
	});
	fenster.addEventListener('appinstalled', () => {
		gemerkt = null;
		installation.angebot = false;
		installation.installiert = true;
	});
}

export async function installiere(): Promise<'angenommen' | 'abgelehnt' | 'nicht-moeglich'> {
	const angebot = gemerkt;
	if (!angebot) return 'nicht-moeglich';
	gemerkt = null;
	installation.angebot = false;
	try {
		await angebot.prompt();
		const { outcome } = await angebot.userChoice;
		return outcome === 'accepted' ? 'angenommen' : 'abgelehnt';
	} catch {
		// Der Dialog kam nicht zustande: wie abgelehnt, es bleibt der Weg über das Menü.
		return 'abgelehnt';
	}
}
