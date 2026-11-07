import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { starteZeitgeber } from './zeitgeber.ts';

const TAG = 24 * 60 * 60 * 1000;

describe('starteZeitgeber', () => {
	const stopps: Array<() => void> = [];
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		stopps.splice(0).forEach((s) => s());
		vi.useRealTimers();
		vi.restoreAllMocks();
	});
	const starte = (lauf: () => Promise<unknown>, takt?: { start: number; abstand: number }) => {
		const stopp = starteZeitgeber(lauf, takt);
		stopps.push(stopp);
		return stopp;
	};

	it('läuft nach der Startverzögerung und dann täglich', async () => {
		const lauf = vi.fn(async () => {});
		starte(lauf);
		await vi.advanceTimersByTimeAsync(59_999);
		expect(lauf).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(lauf).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(TAG);
		expect(lauf).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(TAG);
		expect(lauf).toHaveBeenCalledTimes(3);
	});

	it('ein werfender Lauf stoppt den Takt nicht und loggt ohne Meldungstext', async () => {
		const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
		const lauf = vi.fn(async () => {
			throw new Error('geheim@example.org');
		});
		starte(lauf, { start: 10, abstand: 100 });
		await vi.advanceTimersByTimeAsync(10);
		await vi.advanceTimersByTimeAsync(100);
		expect(lauf).toHaveBeenCalledTimes(2);
		expect(fehler).toHaveBeenCalledWith('Löschlauf fehlgeschlagen');
		expect(JSON.stringify(fehler.mock.calls)).not.toContain('geheim');
	});

	it('ein zweiter Start im selben Prozess startet keinen zweiten Takt', async () => {
		const a = vi.fn(async () => {});
		const b = vi.fn(async () => {});
		starte(a, { start: 10, abstand: 100 });
		starte(b, { start: 10, abstand: 100 });
		await vi.advanceTimersByTimeAsync(10);
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).not.toHaveBeenCalled();
	});

	it('Stopp beendet den Takt', async () => {
		const lauf = vi.fn(async () => {});
		const stopp = starte(lauf, { start: 10, abstand: 100 });
		await vi.advanceTimersByTimeAsync(10);
		stopp();
		await vi.advanceTimersByTimeAsync(1000);
		expect(lauf).toHaveBeenCalledTimes(1);
	});

	it('ein sofort werfender Lauf wird gefangen und der Takt läuft weiter', async () => {
		const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
		const lauf = vi.fn(() => {
			throw new Error('geheim');
		});
		starte(lauf, { start: 10, abstand: 100 });
		await vi.advanceTimersByTimeAsync(10);
		await vi.advanceTimersByTimeAsync(100);
		expect(lauf).toHaveBeenCalledTimes(2);
		expect(fehler).toHaveBeenCalledWith('Löschlauf fehlgeschlagen');
		expect(JSON.stringify(fehler.mock.calls)).not.toContain('geheim');
	});

	it('ein alter Stopp beendet einen neuen Takt nicht', async () => {
		const alt = vi.fn(async () => {});
		const neu = vi.fn(async () => {});
		const stopp1 = starte(alt, { start: 10, abstand: 100 });
		stopp1();
		starte(neu, { start: 10, abstand: 100 });
		stopp1();
		await vi.advanceTimersByTimeAsync(110);
		expect(alt).not.toHaveBeenCalled();
		expect(neu).toHaveBeenCalledTimes(2);
	});
});
