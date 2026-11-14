/**
 * Origin used to build checkout return URLs. Derived from the server's own
 * request URL, never from the client-supplied `Origin` header, so an attacker
 * cannot point a victim's post-payment redirect at another host.
 */
export function trustedAppOrigin(req: Request): string {
  return new URL(req.url).origin;
}
