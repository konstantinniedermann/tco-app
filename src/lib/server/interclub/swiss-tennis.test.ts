import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	istNochNichtFreigeschaltet,
	pruefeClubTeams,
	pruefeTeamResultate,
	WETTBEWERBE
} from './swiss-tennis.ts';

const ORDNER = new URL('../../../../scripts/beispiel-interclub/2026/', import.meta.url);
const lade = (name: string) => JSON.parse(readFileSync(new URL(name, ORDNER), 'utf8'));
const team = (id: number) => lade(`team-results-${id}.json`);

describe('pruefeClubTeams', () => {
	it('liest die Teams der Aktiven und Senioren', () => {
		const teams = pruefeClubTeams(lade('club-teams-ic.json'));
		expect(teams).toHaveLength(10);
		expect(teams![0]).toEqual({ teamId: 7395, liga: '35+ NLA Herren', gruppe: 2, reihenfolge: 35 });
	});

	it('liest die Teams der Junioren', () => {
		expect(pruefeClubTeams(lade('club-teams-jic.json'))).toHaveLength(7);
	});

	it('weist ungültige Formen ab', () => {
		expect(pruefeClubTeams(null)).toBeNull();
		expect(pruefeClubTeams({ teams: 'x' })).toBeNull();
		expect(
			pruefeClubTeams({ teams: [{ id: '1', ligue: { name: { de: 'A' } }, group: 1, order: 1 }] })
		).toBeNull();
		expect(pruefeClubTeams({ teams: [{ id: 1, group: 1, order: 1 }] })).toBeNull();
	});

	it('kennt zwei Wettbewerbe', () => {
		expect(WETTBEWERBE).toEqual(['ic', 'jic']);
	});
});

describe('pruefeTeamResultate', () => {
	it('liest Begegnungen, Rangliste und Aufstiegsspiel', () => {
		const r = pruefeTeamResultate(team(7398), 2026)!;
		expect(r.teamName).toBe('Olten 1');
		expect(r.begegnungen).toHaveLength(6);
		expect(r.begegnungen).toContainEqual({
			begegnungId: 972338,
			runde: 1,
			datum: '2026-05-02',
			heim: 'Olten 1',
			gast: 'Villmergen',
			heimPunkte: 8,
			gastPunkte: 1
		});
		expect(r.rangliste).toHaveLength(4);
		expect(r.rangliste).toContainEqual({
			rang: 2,
			teamName: 'Olten 1',
			stTeamId: 7398,
			punkte: 15,
			saetze: '31 - 27'
		});
		expect(r.entscheide).toHaveLength(1);
		expect(r.entscheide[0]).toMatchObject({
			art: 'aufstieg',
			datum: '2026-06-07',
			zeit: '09:00',
			heim: { stTeamId: 5096, name: 'Schlieren', punkte: 5, markiert: true }
		});
	});

	it('erkennt Abstiegsspiele', () => {
		expect(pruefeTeamResultate(team(7395), 2026)!.entscheide[0].art).toBe('abstieg');
	});

	it('liefert ohne tableau keine Entscheide', () => {
		expect(pruefeTeamResultate(team(15954), 2026)!.entscheide).toEqual([]);
	});

	it('deutet die Markierung nicht als Sieger', () => {
		const e = pruefeTeamResultate(team(7396), 2026)!.entscheide[0];
		expect(e.heim).toMatchObject({ name: 'Neuenhof 2', punkte: 4, markiert: false });
		expect(e.gast).toMatchObject({ name: 'Olten', punkte: 2, markiert: true });
	});

	it('nimmt fehlende oder null-Endstände als offen', () => {
		const json = team(7398);
		json.results[0].homeTeamScore = null;
		delete json.results[0].visitTeamScore;
		const r = pruefeTeamResultate(json, 2026)!;
		const b = r.begegnungen.find((x) => x.begegnungId === json.results[0].encounterId)!;
		expect(b.heimPunkte).toBeNull();
		expect(b.gastPunkte).toBeNull();
	});

	it('weist ungültige Formen ab', () => {
		const a = team(7398);
		a.results = 'x';
		expect(pruefeTeamResultate(a, 2026)).toBeNull();
		const b = team(7398);
		b.results[0].homeTeamScore = '8';
		expect(pruefeTeamResultate(b, 2026)).toBeNull();
		const c = team(7398);
		c.results[0].date = '2.5.';
		expect(pruefeTeamResultate(c, 2026)).toBeNull();
		const d = team(7398);
		delete d.title;
		expect(pruefeTeamResultate(d, 2026)).toBeNull();
		expect(pruefeTeamResultate([], 2026)).toBeNull();
		expect(pruefeTeamResultate(null, 2026)).toBeNull();
	});
});

describe('istNochNichtFreigeschaltet', () => {
	const fehler = { error: 'Java API error: Upstream responded with HTTP 404' };
	it('erkennt das Jahr ohne Daten', () => {
		expect(istNochNichtFreigeschaltet(500, fehler)).toBe(true);
	});
	it('lässt andere Fehler als Fehler', () => {
		expect(istNochNichtFreigeschaltet(500, { error: 'anders' })).toBe(false);
		expect(istNochNichtFreigeschaltet(503, fehler)).toBe(false);
		expect(istNochNichtFreigeschaltet(500, null)).toBe(false);
	});
});
