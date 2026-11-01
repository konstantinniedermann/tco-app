/** Älteste App-Version, die der Server noch bedient; ältere Clients laden neu. */
export const MINDESTVERSION = '0.1.0';

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function teile(version: string): number[] | null {
	const treffer = SEMVER.exec(version);
	return treffer ? treffer.slice(1).map(Number) : null;
}

/**
 * Ist die App-Version mindestens so neu wie die Mindestversion?
 * Eine ungültige App-Version gilt als nicht verträglich; eine ungültige
 * Mindestversion ist ein Konfigurationsfehler und wirft.
 */
export function istVersionVertraeglich(appVersion: string, mindestversion: string): boolean {
	const mindest = teile(mindestversion);
	if (!mindest) {
		throw new Error(`Ungültige Mindestversion: ${JSON.stringify(mindestversion)}`);
	}
	const app = teile(appVersion);
	if (!app) {
		return false;
	}
	for (let i = 0; i < 3; i++) {
		if (app[i] !== mindest[i]) {
			return app[i] > mindest[i];
		}
	}
	return true;
}
