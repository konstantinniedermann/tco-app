import { describe, expect, it } from 'vitest';
import { ipSchluessel } from './ip-schluessel.ts';

describe('ipSchluessel', () => {
	it('IPv4 bleibt unverändert', () => {
		expect(ipSchluessel('192.0.2.1')).toBe('192.0.2.1');
	});

	it('IPv4-mapped IPv6 wird zur IPv4', () => {
		expect(ipSchluessel('::ffff:192.0.2.1')).toBe('192.0.2.1');
	});

	it('Lang- und Kurzform desselben /64 geben denselben Schlüssel', () => {
		expect(ipSchluessel('2001:db8:1:2:3:4:5:6')).toBe('2001:db8:1:2::/64');
		expect(ipSchluessel('2001:0db8:0001:0002:ffff::1')).toBe('2001:db8:1:2::/64');
	});

	it('Kurzschreibweise mit weniger als vier Gruppen vor :: wird aufgefüllt', () => {
		expect(ipSchluessel('2001:db8::1')).toBe('2001:db8:0:0::/64');
	});

	it('schneidet die Zone ab', () => {
		expect(ipSchluessel('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
	});

	it('Gross- und Kleinschreibung ist egal', () => {
		expect(ipSchluessel('2001:DB8::1')).toBe(ipSchluessel('2001:db8::1'));
	});

	it('Nicht lesbares kommt unverändert zurück', () => {
		expect(ipSchluessel('kein-ip')).toBe('kein-ip');
		expect(ipSchluessel('')).toBe('');
	});
});
