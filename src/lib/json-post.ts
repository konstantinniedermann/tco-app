/** Ändernde Anfragen schicken immer JSON (SI-10: Herkunftsschutz, sonst 415). */
export const jsonPost = (inhalt: object): RequestInit => ({
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(inhalt)
});
