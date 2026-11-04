// Hilfen für die Einstiegsseite (A-HILFE-02): Start vom Symbol und Install-Angebot von Chrome
// nachstellen; beides kann Playwright nicht von sich aus.
import type { Page } from '@playwright/test';

/** Die Seite verhält sich, als wäre sie vom Symbol auf dem Startbildschirm gestartet. */
export async function startetVomSymbol(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const echt = window.matchMedia.bind(window);
		window.matchMedia = (abfrage: string) =>
			abfrage === '(display-mode: standalone)'
				? ({
						matches: true,
						media: abfrage,
						addEventListener() {},
						removeEventListener() {}
					} as unknown as MediaQueryList)
				: echt(abfrage);
	});
}

/**
 * Chrome bietet die Installation an; das Mitglied nimmt sie im Dialog an oder lehnt ab.
 * `fehler`: Der Dialog lässt sich nicht öffnen (`prompt()` wirft).
 */
export async function bietetInstallationAn(
	page: Page,
	wahl: 'accepted' | 'dismissed' | 'fehler'
): Promise<void> {
	await page.evaluate((wahl) => {
		const ereignis = new Event('beforeinstallprompt', { cancelable: true });
		Object.assign(ereignis, {
			prompt: async () => {
				if (wahl === 'fehler') throw new Error('Dialog nicht verfügbar');
			},
			userChoice: Promise.resolve({
				outcome: wahl === 'accepted' ? 'accepted' : 'dismissed',
				platform: 'web'
			})
		});
		window.dispatchEvent(ereignis);
	}, wahl);
}
