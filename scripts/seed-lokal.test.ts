import { describe, expect, it } from 'vitest';
import { istLokaleDatenbank } from './seed-lokal.ts';

describe('Seed nur für die lokale Datenbank', () => {
	it.each([
		'postgres://mytco:mytco_lokal@localhost:55432/mytco',
		'postgres://mytco:mytco_lokal@127.0.0.1:55432/mytco'
	])('erlaubt %s', (url) => {
		expect(istLokaleDatenbank(url)).toBe(true);
	});

	it.each([
		'postgres://db.example.org:5432/mytco',
		'postgres://localhost.example.org/mytco',
		'kein url',
		undefined
	])('verweigert %s', (url) => {
		expect(istLokaleDatenbank(url)).toBe(false);
	});
});
