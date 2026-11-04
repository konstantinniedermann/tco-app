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

/** Chrome bietet die Installation an; das Mitglied nimmt sie im Dialog an oder lehnt ab. */
export async function bietetInstallationAn(
	page: Page,
	wahl: 'accepted' | 'dismissed'
): Promise<void> {
	await page.evaluate((outcome) => {
		const ereignis = new Event('beforeinstallprompt', { cancelable: true });
		Object.assign(ereignis, {
			prompt: async () => {},
			userChoice: Promise.resolve({ outcome, platform: 'web' })
		});
		window.dispatchEvent(ereignis);
	}, wahl);
}
