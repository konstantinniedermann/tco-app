import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { tempOrdner } from './hilfe.ts';

// pruefen.sh mit Ersatzbefehlen (tests/betrieb/stubs-server) und eigener Wurzel für /etc.
const STUBS = resolve(import.meta.dirname, 'stubs-server');

const SICHER_SSHD = [
	'port 22',
	'permitrootlogin no',
	'passwordauthentication no',
	'kbdinteractiveauthentication no',
	'permituserenvironment no'
].join('\n');

const SICHER_UFW = [
	'Status: active',
	'Logging: off',
	'Default: deny (incoming), allow (outgoing), deny (routed)',
	'New profiles: skip',
	'',
	'To                         Action      From',
	'--                         ------      ----',
	'22/tcp                     ALLOW IN    Anywhere',
	'80/tcp                     ALLOW IN    Anywhere',
	'443/tcp                    ALLOW IN    Anywhere',
	'443/udp                    ALLOW IN    Anywhere',
	'22/tcp (v6)                ALLOW IN    Anywhere (v6)',
	'80/tcp (v6)                ALLOW IN    Anywhere (v6)',
	'443/tcp (v6)               ALLOW IN    Anywhere (v6)',
	'443/udp (v6)               ALLOW IN    Anywhere (v6)'
].join('\n');

const SICHER_JOURNALD = [
	'# /etc/systemd/journald.conf',
	'[Journal]',
	'#MaxRetentionSec=0',
	'',
	'# /etc/systemd/journald.conf.d/mytco.conf',
	'[Journal]',
	'Storage=persistent',
	'MaxRetentionSec=24h'
].join('\n');

const SICHER_LOGROTATE = [
	'/opt/mytco/*/protokoll.log {',
	'\tsu mytco mytco',
	'\tdaily',
	'\trotate 30',
	'\tmaxage 30',
	'\tcopytruncate',
	'\tmissingok',
	'}',
	'/var/lib/docker/containers/*/*-json.log {',
	'\tdaily',
	'\trotate 30',
	'\tmaxage 30',
	'\tcopytruncate',
	'\tmissingok',
	'}'
].join('\n');

const SICHER_ANMELDUNGEN = '/var/log/wtmp {\n\tdaily\n\trotate 0\n\tmissingok\n}\n';

const SICHER: Record<string, string> = {
	STUB_SSHD_T: SICHER_SSHD,
	STUB_UFW: SICHER_UFW,
	STUB_AKTIV_unattended_upgrades: 'active',
	STUB_AKTIV_rsyslog: 'inactive',
	STUB_APT: 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";',
	STUB_JOURNALD: SICHER_JOURNALD,
	STUB_STAT_BASIS: 'mytco:mytco 750',
	STUB_STAT_BIN: 'root:root 755',
	STUB_ID: 'mytco docker'
};

const SICHERE_DATEIEN: Record<string, string> = {
	'etc/logrotate.d/mytco': SICHER_LOGROTATE,
	'etc/logrotate.d/wtmp': SICHER_ANMELDUNGEN,
	'etc/logrotate.d/btmp': SICHER_ANMELDUNGEN.replace('wtmp', 'btmp')
};

function pruefen(
	ersetzt: Record<string, string> = {},
	dateien: Record<string, string | null> = {}
) {
	const wurzel = tempOrdner('mytco-wurzel-');
	for (const [pfad, inhalt] of Object.entries({ ...SICHERE_DATEIEN, ...dateien })) {
		if (inhalt === null) continue;
		mkdirSync(dirname(join(wurzel, pfad)), { recursive: true });
		writeFileSync(join(wurzel, pfad), inhalt);
	}
	const lauf = spawnSync('bash', [resolve('betrieb/server/pruefen.sh')], {
		encoding: 'utf-8',
		env: {
			...process.env,
			PATH: `${STUBS}:${process.env.PATH ?? ''}`,
			MYTCO_WURZEL: wurzel,
			...SICHER,
			...ersetzt
		}
	});
	const zeilen = lauf.stdout.trim().split('\n');
	return { status: lauf.status, zeilen, stderr: lauf.stderr };
}

const NAMEN = [
	'ssh-passwort',
	'ssh-root',
	'ssh-umgebung',
	'firewall',
	'updates',
	'journal',
	'rsyslog',
	'protokolle',
	'anmeldungen',
	'betrieb'
];

describe('pruefen.sh', () => {
	test('alles sicher: jede Massnahme ok, letzte Zeile ok, Exit 0', () => {
		const lauf = pruefen();
		expect(lauf.zeilen).toEqual([...NAMEN.map((n) => `ok ${n}`), 'ok']);
		expect(lauf.status).toBe(0);
	});

	test.each([
		// Review Focus: ein Drop-in der Distribution übersteuert die eigene Datei; zählt der wirksame Wert
		[
			'ssh-passwort',
			{
				STUB_SSHD_T: SICHER_SSHD.replace('passwordauthentication no', 'passwordauthentication yes')
			}
		],
		[
			'ssh-passwort',
			{
				STUB_SSHD_T: SICHER_SSHD.replace(
					'kbdinteractiveauthentication no',
					'kbdinteractiveauthentication yes'
				)
			}
		],
		[
			'ssh-root',
			{
				STUB_SSHD_T: SICHER_SSHD.replace('permitrootlogin no', 'permitrootlogin prohibit-password')
			}
		],
		[
			'ssh-umgebung',
			{ STUB_SSHD_T: SICHER_SSHD.replace('permituserenvironment no', 'permituserenvironment yes') }
		],
		['firewall', { STUB_UFW: SICHER_UFW.replace('Status: active', 'Status: inactive') }],
		['firewall', { STUB_UFW: SICHER_UFW.replace('Logging: off', 'Logging: on (low)') }],
		['firewall', { STUB_UFW: SICHER_UFW.replace('deny (incoming)', 'allow (incoming)') }],
		['firewall', { STUB_UFW: `${SICHER_UFW}\n5432/tcp                   ALLOW IN    Anywhere` }],
		[
			'firewall',
			{ STUB_UFW: SICHER_UFW.replace(/^22\/tcp .*$/gm, '').replace(/^22\/tcp \(v6\).*$/gm, '') }
		],
		['updates', { STUB_AKTIV_unattended_upgrades: 'inactive' }],
		['updates', { STUB_APT: 'APT::Periodic::Unattended-Upgrade "0";' }],
		[
			'journal',
			{ STUB_JOURNALD: SICHER_JOURNALD.replace('MaxRetentionSec=24h', 'MaxRetentionSec=2d') }
		],
		[
			'journal',
			{ STUB_JOURNALD: SICHER_JOURNALD.replace('MaxRetentionSec=24h', '#MaxRetentionSec=24h') }
		],
		[
			'journal',
			{ STUB_JOURNALD: SICHER_JOURNALD.replace('Storage=persistent', 'Storage=volatile') }
		],
		// Review Focus: rsyslog schreibt IP-Adressen nach /var/log/auth.log mit Wochenrotation
		['rsyslog', { STUB_AKTIV_rsyslog: 'active' }],
		['betrieb', { STUB_STAT_BASIS: 'root:root 755' }],
		['betrieb', { STUB_STAT_BIN: 'mytco:mytco 755' }],
		['betrieb', { STUB_ID: 'mytco' }]
	])('unsicher → fehler %s, Exit 1', (name, ersetzt) => {
		const lauf = pruefen(ersetzt);
		expect(lauf.zeilen).toContain(`fehler ${name}`);
		expect(lauf.zeilen.at(-1)).toBe('fehler');
		expect(lauf.status).toBe(1);
	});

	test.each([['1d'], ['86400'], ['86400s'], ['12h'], ['90min']])(
		'journal: MaxRetentionSec=%s gilt als höchstens 24 Stunden',
		(wert) => {
			const lauf = pruefen({
				STUB_JOURNALD: SICHER_JOURNALD.replace('MaxRetentionSec=24h', `MaxRetentionSec=${wert}`)
			});
			expect(lauf.zeilen).toContain('ok journal');
		}
	);

	test.each([
		['protokolle', { 'etc/logrotate.d/mytco': null }],
		[
			'protokolle',
			{ 'etc/logrotate.d/mytco': SICHER_LOGROTATE.replace(/maxage 30/g, 'maxage 60') }
		],
		[
			'protokolle',
			{ 'etc/logrotate.d/mytco': SICHER_LOGROTATE.replace(/^\/var\/lib\/docker[\s\S]*$/m, '') }
		],
		['anmeldungen', { 'etc/logrotate.d/btmp': '/var/log/btmp {\n\tmonthly\n\trotate 1\n}\n' }]
	])('unsichere Datei → fehler %s', (name, dateien) => {
		const lauf = pruefen({}, dateien);
		expect(lauf.zeilen).toContain(`fehler ${name}`);
		expect(lauf.status).toBe(1);
	});

	test('gibt keine Werte aus, nur ok/fehler mit Namen', () => {
		const lauf = pruefen({ STUB_SSHD_T: `${SICHER_SSHD}\nGEHEIM-WERT` });
		for (const zeile of lauf.zeilen) expect(zeile).toMatch(/^(ok|fehler)( [a-z-]+)?$/);
		expect(lauf.stderr).not.toContain('GEHEIM-WERT');
	});
});
