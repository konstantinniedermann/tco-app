import { describe, expect, test } from 'vitest';
import { ERLAUBT_IN_ANSICHT, riegel } from './admin/ansicht.ts';
import { effektiveRollen } from './admin/rollen.ts';

describe('Ansicht als …: Riegel für speichernde Anfragen', () => {
	test('in der Ansicht scheitert jede speichernde Anfrage, auch Eigenes', async () => {
		const r = riegel('POST', '/api/profil', 'cm');
		expect(r).not.toBeNull();
		expect([r!.status, await r!.json()]).toEqual([403, { fehler: 'nur-ansehen' }]);
		expect(r!.headers.get('cache-control')).toBe('no-store');
		const d = riegel('DELETE', '/api/passkey', 'mitglied');
		expect([d?.status, await d?.json()]).toEqual([403, { fehler: 'nur-ansehen' }]);
		expect(riegel('PUT', '/api/admin/mitglieder/1', 'mitglieder')?.status).toBe(403);
		expect(riegel('POST', '/api/admin/ansicht', 'lizenz')?.status).toBe(403);
	});

	test('Beenden, Logout und die Bestätigung per Mail-Code bleiben offen', () => {
		expect(riegel('POST', '/api/logout', 'cm')).toBeNull();
		for (const pfad of ERLAUBT_IN_ANSICHT) expect(riegel('POST', pfad, 'mitglied')).toBeNull();
	});

	test('die Ausnahmen gelten nur für den genauen Pfad, nicht mit Schrägstrich am Ende', () => {
		expect(riegel('POST', '/api/logout/', 'cm')?.status).toBe(403);
		expect(riegel('POST', '/api/admin/ansicht/beenden/', 'cm')?.status).toBe(403);
	});

	test('Lesen bleibt offen, ohne Ansicht greift der Riegel nicht', () => {
		expect(riegel('GET', '/api/admin/mitglieder', 'cm')).toBeNull();
		expect(riegel('HEAD', '/api/sitzung', 'cm')).toBeNull();
		expect(riegel('POST', '/api/profil', null)).toBeNull();
		expect(riegel('POST', '/verwaltung', 'cm')).toBeNull();
	});

	test('effektiveRollen: ohne Ansicht die echten, Mitglied und Lizenz-Admin ohne Verwaltung', () => {
		expect(effektiveRollen(['mytco', 'mitglieder'], null)).toEqual(['mytco', 'mitglieder']);
		expect(effektiveRollen(['mytco'], 'mitglied')).toEqual([]);
		expect(effektiveRollen(['mytco'], 'lizenz')).toEqual([]);
		expect(effektiveRollen(['mytco'], 'cm')).toEqual(['cm']);
		expect(effektiveRollen(['mytco', 'cm'], 'mitglieder')).toEqual(['mitglieder']);
	});
});
